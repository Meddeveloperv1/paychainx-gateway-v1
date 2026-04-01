import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { SaleRequest } from './schemas.js';
import { CyberSourceAdapter } from '../../adapters/cybersource/adapter.js';

const processor = new CyberSourceAdapter();

export async function createSale(auth: NonNullable<import('fastify').FastifyRequest['auth']>, input: SaleRequest) {
  const insertedIntent = await db.insert(paymentIntents).values({
    merchantId: auth.merchantId,
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    status: 'created',
    paymentMethodType: input.payment_method.type,
    paymentTokenRef: input.payment_method.token_ref,
    customerRef: input.customer?.customer_ref,
    customerEmail: input.customer?.email,
    description: input.description,
    processor: 'cybersource'
  }).returning();

  const intent = insertedIntent[0];

  const requestPayload = JSON.stringify({
    merchant_reference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    payment_method: input.payment_method,
    customer: input.customer,
    description: input.description
  });

  const insertedAttempt = await db.insert(paymentAttempts).values({
    paymentIntentId: intent.id,
    merchantId: auth.merchantId,
    action: 'sale',
    processor: 'cybersource',
    status: 'pending',
    requestPayload
  }).returning();

  const attempt = insertedAttempt[0];

  const result = await processor.sale({
    merchantReference: input.merchant_reference,
    amount: input.amount,
    currency: input.currency,
    tokenRef: input.payment_method.token_ref,
    customerEmail: input.customer?.email,
    description: input.description
  });

  await db.update(paymentAttempts)
    .set({
      status: result.success ? 'succeeded' : 'failed',
      processorTransactionId: result.processorTransactionId,
      processorStatus: result.processorStatus,
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
    processor: 'cybersource',
    processor_transaction_id: result.processorTransactionId ?? null,
    payment_attempt_id: attempt.id,
    created_at: intent.createdAt,
    error_message: result.errorMessage ?? null
  };
}
