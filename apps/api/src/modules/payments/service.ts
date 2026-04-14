import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts } from '../../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { SaleRequest, CaptureRequest, VoidRequest, RefundRequest } from './schemas.js';
import { resolveProcessor } from './processor-router.js';

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
  const processorSelection = resolveProcessor(input.routing?.preferred_processor);
  const processor = processorSelection.adapter;

  const insertedIntent = await db.insert(paymentIntents).values({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    status: 'created',
    paymentMethodType: input.payment_source.type,
    paymentTokenRef: input.payment_source.token ?? '',
    customerRef: input.customer?.customer_ref,
    customerEmail: input.customer?.email,
    processor: processorSelection.name
  }).returning();

  const intent = insertedIntent[0];

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: intent.id,
    merchantId: auth.merchantId,
    action: 'sale',
    processor: processorSelection.name,
    status: 'pending',
    requestPayload: JSON.stringify(input)
  }).returning();

  const attempt = insertedAttempt[0];

  const result = await processor.sale({
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    paymentSourceType: input.payment_source.type,
    tokenRef: input.payment_source.token ?? '',
    customerEmail: input.customer?.email
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
    processor: processorSelection.name,
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    created_at: intent.createdAt,
    error_message: result.errorMessage ?? null
  };
}

export async function capturePayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: CaptureRequest) {
  const processorSelection = resolveProcessor('cybersource');
  const processor = processorSelection.adapter;

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'capture',
    processor: processorSelection.name,
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

  return {
    payment_id: input.payment_id,
    status: result.success ? 'captured' : 'failed',
    processor: processorSelection.name,
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    error_message: result.errorMessage ?? null
  };
}

export async function voidPayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: VoidRequest) {
  const processorSelection = resolveProcessor('cybersource');
  const processor = processorSelection.adapter;

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'void',
    processor: processorSelection.name,
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

  return {
    payment_id: input.payment_id,
    status: result.success ? 'voided' : 'failed',
    processor: processorSelection.name,
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    error_message: result.errorMessage ?? null
  };
}

export async function refundPayment(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: RefundRequest) {
  const processorSelection = resolveProcessor('cybersource');
  const processor = processorSelection.adapter;

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: input.payment_id,
    merchantId: auth.merchantId,
    action: 'refund',
    processor: processorSelection.name,
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

  return {
    payment_id: input.payment_id,
    status: result.success ? 'refunded' : 'failed',
    processor: processorSelection.name,
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    error_message: result.errorMessage ?? null
  };
}
