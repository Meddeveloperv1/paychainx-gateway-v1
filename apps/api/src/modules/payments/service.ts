import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts, proofVault } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { SaleRequest, CaptureRequest, VoidRequest, RefundRequest } from './schemas.js';
import { CyberSourceAdapter } from '../../adapters/cybersource/adapter.js';
import { BankRailAdapter } from '../../adapters/bank-rail/adapter.js';
import { resolveProcessor } from './processor-router.js';
import { resolveMerchantRoutingProfile } from './merchant-resolver.js';
import { resolveProcessorCredentials } from './credential-resolver.js';
import { getCachedMerchantRoutingProfile, setCachedMerchantRoutingProfile } from '../cache/merchant-profile-cache.js';
import { getCachedProcessorCredentials, setCachedProcessorCredentials } from '../cache/credential-cache.js';
import { buildPQAuditEnvelope } from '../pq/hybrid-audit.js';
import { buildPQProofRequest } from '../pq/proof-request.js';
import { submitPQProofRequest, submitPQProofStrict } from '../pq/sidecar-client.js';
import { enqueueAuditEvent, setPQProofStatus } from '../audit/audit-queue.js';
import { enqueueProofJob } from '../proofs/queue.js';

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

  let merchantRoutingProfile: any = getCachedMerchantRoutingProfile(auth.merchantId);
  if (!merchantRoutingProfile) {
    merchantRoutingProfile = await resolveMerchantRoutingProfile(auth.merchantId) as any;
    setCachedMerchantRoutingProfile(merchantRoutingProfile);
  }

  const normalizedCurrency = input.currency.toUpperCase();

  if (!merchantRoutingProfile.allowedCurrencies.includes(normalizedCurrency)) {
    throw new Error(`UNSUPPORTED_CURRENCY_FOR_MERCHANT: ${normalizedCurrency}`);
  }

  if (!merchantRoutingProfile.cybersourceEnabled && merchantRoutingProfile.defaultProcessor === 'cybersource') {
    throw new Error('PROCESSOR_DISABLED_FOR_MERCHANT: cybersource');
  }

  const selectedProcessor = resolveProcessor({
    amount: input.amount,
    currency: normalizedCurrency,
    merchantId: auth.merchantId,
    requestedProcessor: input.requested_processor ?? merchantRoutingProfile.defaultProcessor
  });

  const processorName = selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource';

  let resolvedCredentials = getCachedProcessorCredentials(auth.merchantId, processorName);
  if (!resolvedCredentials) {
    resolvedCredentials = await resolveProcessorCredentials(auth.merchantId, processorName);
    setCachedProcessorCredentials(resolvedCredentials);
  }

  if (process.env.LOG_HOT_PATH === 'true') {
    console.log('STRICT_PROFILE', auth.merchantId, merchantRoutingProfile);
    console.log('RESOLVED_CREDENTIALS', resolvedCredentials);
  }

  const pqAuditEnvelope = buildPQAuditEnvelope({
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: normalizedCurrency,
    processor: processorName,
    requestedProcessor: input.requested_processor ?? null
  });

  const insertedIntent = await db.insert(paymentIntents).values({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: normalizedCurrency,
    status: 'created',
    paymentMethodType: normalizedPaymentMethod.type,
    paymentTokenRef: normalizedPaymentMethod.token_ref,
    customerRef: input.customer?.customer_ref,
    customerEmail: input.customer?.email,
    description: input.description,
    processor: processorName
  }).returning();

  const intent = insertedIntent[0];
  const saleRequestPayload = { input, pq_audit: pqAuditEnvelope };

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: intent.id,
    merchantId: auth.merchantId,
    action: 'sale',
    processor: processorName,
    status: 'pending',
    requestPayload: JSON.stringify(saleRequestPayload)
  }).returning();

  const attempt = insertedAttempt[0];

  const pqProofRequest = buildPQProofRequest({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    paymentIntentId: intent.id,
    paymentAttemptId: attempt.id,
    amount: input.amount,
    currency: normalizedCurrency,
    processor: processorName,
    requestedProcessor: input.requested_processor ?? null,
    body: saleRequestPayload
  });

  enqueueAuditEvent('pq.proof.request', pqProofRequest);

  if ((merchantRoutingProfile as any).pqStrictMode) {
    const strictResult = await submitPQProofStrict(pqProofRequest);

    setPQProofStatus(pqProofRequest.merchantReference, {
      merchantReference: pqProofRequest.merchantReference,
      payloadHash: pqProofRequest.payloadHash,
      status: strictResult.status,
      mode: strictResult.mode,
      proofId: strictResult.proofId,
      error: strictResult.error,
      updatedAt: new Date().toISOString()
    });

    if (strictResult.proofId) {
      await db.insert(proofVault).values({
        proofId: strictResult.proofId,
        paymentAttemptId: attempt.id,
        merchantId: auth.merchantId,
        merchantReference: pqProofRequest.merchantReference,
        proofHash: pqProofRequest.payloadHash,
        hashAlgorithm: 'sha256',
        signature: null,
        signatureAlgorithm: null,
        proofStatus: strictResult.status,
        createdAt: new Date(),
        verifiedAt: null,
        policySnapshot: JSON.stringify({ pq_mode: 'strict' }),
        requestFingerprint: pqProofRequest.payloadHash,
        processorResponseFingerprint: null,
        sidecarVersion: 'stub-v1',
        evidenceBundleUri: null
      });
    }

    if (strictResult.status !== 'submitted') {
      throw new Error(`PQ_STRICT_MODE_FAILED: ${strictResult.error || 'proof submission failed'}`);
    }
  } else {
    setPQProofStatus(pqProofRequest.merchantReference, {
      merchantReference: pqProofRequest.merchantReference,
      payloadHash: pqProofRequest.payloadHash,
      status: 'queued',
      mode: 'async-audit',
      updatedAt: new Date().toISOString()
    });

    if (process.env.PROOF_QUEUE_ENABLED === 'true') {
      await enqueueProofJob({
        merchantId: auth.merchantId,
        merchantReference: pqProofRequest.merchantReference,
        paymentIntentId: intent.id,
        paymentAttemptId: attempt.id,
        payload: pqProofRequest,
        payloadHash: pqProofRequest.payloadHash,
        mode: 'async-audit'
      });
    } else {
      void submitPQProofRequest(pqProofRequest).then(async (res) => {
        setPQProofStatus(pqProofRequest.merchantReference, {
          merchantReference: pqProofRequest.merchantReference,
          payloadHash: pqProofRequest.payloadHash,
          status: res.status,
          mode: res.mode,
          proofId: res.proofId,
          error: res.error,
          updatedAt: new Date().toISOString()
        });

        if (res.proofId) {
          await db.insert(proofVault).values({
            proofId: res.proofId,
            paymentAttemptId: attempt.id,
            merchantId: auth.merchantId,
            merchantReference: pqProofRequest.merchantReference,
            proofHash: pqProofRequest.payloadHash,
            hashAlgorithm: 'sha256',
            signature: null,
            signatureAlgorithm: null,
            proofStatus: res.status,
            createdAt: new Date(),
            verifiedAt: null,
            policySnapshot: JSON.stringify({ pq_mode: res.mode }),
            requestFingerprint: pqProofRequest.payloadHash,
            processorResponseFingerprint: null,
            sidecarVersion: 'stub-v1',
            evidenceBundleUri: null
          });
        }
      }).catch(() => {});
    }
  }

  let result;
  if (selectedProcessor === 'bank_rail') {
    result = await bankRailProcessor.sale({
      merchantReference: input.merchant_reference,
      amount: input.amount,
      currency: normalizedCurrency,
      customerEmail: input.customer?.email,
      description: input.description
    });
  } else {
    result = await processor.sale({
      merchantReference: input.merchant_reference,
      amount: input.amount,
      currency: normalizedCurrency,
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
    currency: normalizedCurrency,
    processor: processorName,
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

export async function createAuth(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: any) {
  const normalizedPaymentMethod = input.payment_method ?? (
    input.payment_source
      ? { type: 'card_token' as const, token_ref: 'test_token_visa' }
      : undefined
  );

  if (!normalizedPaymentMethod) {
    throw new Error('payment_method or payment_source required');
  }

  let merchantRoutingProfile: any = getCachedMerchantRoutingProfile(auth.merchantId);
  if (!merchantRoutingProfile) {
    merchantRoutingProfile = await resolveMerchantRoutingProfile(auth.merchantId) as any;
    setCachedMerchantRoutingProfile(merchantRoutingProfile);
  }

  const normalizedCurrency = input.currency.toUpperCase();

  if (!merchantRoutingProfile.allowedCurrencies.includes(normalizedCurrency)) {
    throw new Error(`UNSUPPORTED_CURRENCY_FOR_MERCHANT: ${normalizedCurrency}`);
  }

  const selectedProcessor = resolveProcessor({
    amount: input.amount,
    currency: normalizedCurrency,
    merchantId: auth.merchantId,
    requestedProcessor: input.requested_processor ?? merchantRoutingProfile.defaultProcessor
  });

  const processorName = selectedProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource';

  const insertedIntent = await db.insert(paymentIntents).values({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: normalizedCurrency,
    status: 'created',
    paymentMethodType: normalizedPaymentMethod.type,
    paymentTokenRef: normalizedPaymentMethod.token_ref,
    customerEmail: input.customer_email,
    description: input.description,
    processor: processorName
  }).returning();

  const intent = insertedIntent[0];

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: intent.id,
    merchantId: auth.merchantId,
    action: 'auth',
    processor: processorName,
    status: 'pending',
    requestPayload: JSON.stringify(input)
  }).returning();

  const attempt = insertedAttempt[0];

  let result;
  if (selectedProcessor === 'bank_rail') {
    result = {
      success: false,
      status: 'failed',
      errorMessage: 'BANK_RAIL_AUTH_NOT_IMPLEMENTED'
    };
  } else {
    if (typeof (processor as any).authorize === 'function') {
      result = await (processor as any).authorize({
        merchantReference: input.merchant_reference,
        amount: input.amount,
        currency: normalizedCurrency,
        tokenRef: normalizedPaymentMethod.token_ref,
        customerEmail: input.customer_email,
        description: input.description
      });
    } else {
      result = {
        success: false,
        status: 'failed',
        errorMessage: 'PROCESSOR_AUTH_NOT_IMPLEMENTED'
      };
    }
  }

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId ?? null,
      processorStatus: result.processorStatus ?? null,
      processorHttpStatus: result.processorHttpStatus ? String(result.processorHttpStatus) : null,
      responsePayload: JSON.stringify(result.responsePayload ?? result),
      errorMessage: result.errorMessage ?? null,
      updatedAt: new Date()
    })
    .where(eq(paymentAttempts.id, attempt.id));

  await db.update(paymentIntents)
    .set({
      status: result.success ? 'authorized' : 'failed',
      updatedAt: new Date()
    })
    .where(eq(paymentIntents.id, intent.id));

  return {
    id: intent.id,
    merchant_reference: intent.merchantReference,
    status: result.success ? 'authorized' : 'failed',
    amount: intent.amount,
    currency: intent.currency,
    processor: processorName,
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    created_at: intent.createdAt,
    error_message: result.errorMessage ?? null
  };
}

