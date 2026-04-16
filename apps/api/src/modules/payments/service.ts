import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { SaleRequest, CaptureRequest, VoidRequest, RefundRequest } from './schemas.js';
import { CyberSourceAdapter } from '../../adapters/cybersource/adapter.js';
import { BankRailAdapter } from '../../adapters/bank-rail/adapter.js';
import { resolveProcessor } from './processor-router.js';
import { resolveMerchantRoutingProfile } from './merchant-resolver.js';
import { getCachedMerchantRoutingProfile, setCachedMerchantRoutingProfile } from '../cache/merchant-profile-cache.js';
import { resolveProcessorCredentials } from './credential-resolver.js';
import { getCachedProcessorCredentials, setCachedProcessorCredentials } from '../cache/credential-cache.js';
import { buildPQAuditEnvelope } from '../pq/hybrid-audit.js';
import { buildPQProofRequest } from '../pq/proof-request.js';
import { enqueueAuditEvent, setPQProofStatus } from '../audit/audit-queue.js';
import { submitPQProofRequest } from '../pq/sidecar-client.js';

const processor = new CyberSourceAdapter();
const bankRailProcessor = new BankRailAdapter();

export async function getPaymentById(paymentId: string) {
  const rows = await db.select().from(paymentIntents).where(eq(paymentIntents.id, paymentId)).limit(1);
  return rows[0] ?? null;
}

export async function getPaymentAttempts(paymentId: string) {
  return db.select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.paymentIntentId, paymentId))
    .orderBy(desc(paymentAttempts.createdAt));
}

export async function createSale(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: SaleRequest) {
  const normalizedPaymentMethod = input.payment_method ?? (
    input.payment_source
      ? { type: 'card_token' as const, token_ref: 'test_token_visa' }
      : undefined
  );

  if (!normalizedPaymentMethod) {
    throw new Error('payment_method or payment_source required');
  }

  let merchantRoutingProfile = getCachedMerchantRoutingProfile(auth.merchantId);
  if (!merchantRoutingProfile) {
    merchantRoutingProfile = await resolveMerchantRoutingProfile(auth.merchantId);
    setCachedMerchantRoutingProfile(merchantRoutingProfile);
  }
  const selectedProcessor = resolveProcessor({
    amount: input.amount,
    currency: input.currency,
    merchantId: auth.merchantId,
    requestedProcessor: input.requested_processor ?? merchantRoutingProfile.defaultProcessor
  });

  const processorName = selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource';
  let resolvedCredentials = getCachedProcessorCredentials(auth.merchantId, processorName);
  if (!resolvedCredentials) {
    resolvedCredentials = await resolveProcessorCredentials(auth.merchantId, processorName);
    setCachedProcessorCredentials(resolvedCredentials);
  }

  const pqAuditEnvelope = buildPQAuditEnvelope({
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    processor: selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource',
    requestedProcessor: input.requested_processor ?? null
  });

  if (process.env.LOG_HOT_PATH === 'true') {
    console.log('MERCHANT_ROUTING_PROFILE:', merchantRoutingProfile);
    console.log('RESOLVED_CREDENTIALS:', resolvedCredentials);
    console.log('REQUESTED_PROCESSOR:', input.requested_processor, 'SELECTED_PROCESSOR:', selectedProcessor);
    console.log('PQ_AUDIT_ENVELOPE:', pqAuditEnvelope);
  }
  enqueueAuditEvent('payment.sale', pqAuditEnvelope);

  const insertedIntent = await db.insert(paymentIntents).values({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    status: 'created',
    paymentMethodType: normalizedPaymentMethod.type,
    paymentTokenRef: normalizedPaymentMethod.token_ref,
    customerRef: input.customer?.customer_ref,
    customerEmail: input.customer?.email,
    description: input.description,
    processor: selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource'
  }).returning();

  const intent = insertedIntent[0];

  const saleRequestPayload = { input, pq_audit: pqAuditEnvelope };
  const pqProofRequest = buildPQProofRequest({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    processor: selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource',
    requestedProcessor: input.requested_processor ?? null,
    body: saleRequestPayload
  });
  enqueueAuditEvent('pq.proof.request', pqProofRequest);
  void submitPQProofRequest(pqProofRequest).then((res) => {
    setPQProofStatus(pqProofRequest.merchantReference, {
      merchantReference: pqProofRequest.merchantReference,
      payloadHash: pqProofRequest.payloadHash,
      status: res.status,
      mode: res.mode,
      updatedAt: new Date().toISOString()
    });
  });

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: intent.id,
    merchantId: auth.merchantId,
    action: 'sale',
    processor: selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource',
    status: 'pending',
    requestPayload: JSON.stringify(saleRequestPayload)
  }).returning();

  const attempt = insertedAttempt[0];

  let result;
  if (selectedProcessor === 'bank_rail') {
    result = await bankRailProcessor.sale({
      merchantReference: input.merchant_reference,
      amount: input.amount,
      currency: input.currency,
      customerEmail: input.customer?.email,
      description: input.description
    });
  } else {
    result = await processor.sale({
      merchantReference: input.merchant_reference,
      amount: input.amount,
      currency: input.currency,
      tokenRef: normalizedPaymentMethod.token_ref,
      customerEmail: input.customer?.email,
      description: input.description
    });
  }

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId,
      processorStatus: result.processorStatus,
      processorHttpStatus: result.processorHttpStatus ? String(result.processorHttpStatus) : null,
      responsePayload: JSON.stringify(result.responsePayload),
      errorMessage: result.errorMessage,
      updatedAt: new Date()
    })
    .where(eq(paymentAttempts.id, attempt.id));

  await db.update(paymentIntents)
    .set({
      status: result.success ? result.status : 'failed',
      updatedAt: new Date()
    })
    .where(eq(paymentIntents.id, intent.id));

  return {
    id: intent.id,
    merchant_reference: intent.merchantReference,
    status: result.success ? result.status : 'failed',
    amount: intent.amount,
    currency: intent.currency,
    processor: selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource',
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    created_at: intent.createdAt,
    error_message: result.errorMessage ?? null
  };
}

export async function capturePayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: CaptureRequest) {
  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'capture',
    processor: 'cybersource',
    status: 'pending',
    requestPayload: JSON.stringify(input)
  }).returning();

  const attempt = insertedAttempt[0];

  const result = await processor.capture({
    processorTransactionId: input.processor_transaction_id,
    amount: input.amount,
    currency: input.currency
  });

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId,
      processorStatus: result.processorStatus,
      processorHttpStatus: result.processorHttpStatus ? String(result.processorHttpStatus) : null,
      responsePayload: JSON.stringify(result.responsePayload),
      errorMessage: result.errorMessage,
      updatedAt: new Date()
    })
    .where(eq(paymentAttempts.id, attempt.id));

  await db.update(paymentIntents)
    .set({
      status: result.success ? 'captured' : 'failed',
      updatedAt: new Date()
    })
    .where(eq(paymentIntents.id, input.payment_id));

  return result;
}

export async function voidPayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: VoidRequest) {
  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'void',
    processor: 'cybersource',
    status: 'pending',
    requestPayload: JSON.stringify(input)
  }).returning();

  const attempt = insertedAttempt[0];

  const result = await processor.void({
    processorTransactionId: input.processor_transaction_id
  });

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId,
      processorStatus: result.processorStatus,
      processorHttpStatus: result.processorHttpStatus ? String(result.processorHttpStatus) : null,
      responsePayload: JSON.stringify(result.responsePayload),
      errorMessage: result.errorMessage,
      updatedAt: new Date()
    })
    .where(eq(paymentAttempts.id, attempt.id));

  await db.update(paymentIntents)
    .set({
      status: result.success ? 'voided' : 'failed',
      updatedAt: new Date()
    })
    .where(eq(paymentIntents.id, input.payment_id));

  return result;
}

export async function refundPayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: RefundRequest) {
  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'refund',
    processor: 'cybersource',
    status: 'pending',
    requestPayload: JSON.stringify(input)
  }).returning();

  const attempt = insertedAttempt[0];

  const result = await processor.refund({
    processorTransactionId: input.processor_transaction_id,
    amount: input.amount,
    currency: input.currency
  });

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId,
      processorStatus: result.processorStatus,
      processorHttpStatus: result.processorHttpStatus ? String(result.processorHttpStatus) : null,
      responsePayload: JSON.stringify(result.responsePayload),
      errorMessage: result.errorMessage,
      updatedAt: new Date()
    })
    .where(eq(paymentAttempts.id, attempt.id));

  await db.update(paymentIntents)
    .set({
      status: result.success ? 'refunded' : 'failed',
      updatedAt: new Date()
    })
    .where(eq(paymentIntents.id, input.payment_id));

  return result;
}
