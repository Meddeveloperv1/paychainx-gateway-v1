import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { merchants, apiKeys, paymentIntents, paymentAttempts, proofVault, webhookDeliveries } from '../../db/schema.js';
import { generateApiKey, hashApiKey } from '../../lib/api-key.js';

export async function createMerchant(input: { name: string }) {
  const inserted = await db.insert(merchants).values({
    name: input.name,
    status: 'active'
  }).returning();

  return inserted[0];
}

export async function createMerchantApiKey(merchantId: string) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const inserted = await db.insert(apiKeys).values({
    merchantId,
    keyHash,
    label: 'default',
    status: 'active'
  }).returning();

  return { rawKey, apiKey: inserted[0] };
}


export async function getAdminPaymentDetail(merchantId: string, paymentId: string) {
  const intentRows = await db.select()
    .from(paymentIntents)
    .where(and(
      eq(paymentIntents.id, paymentId),
      eq(paymentIntents.merchantId, merchantId)
    ))
    .limit(1);

  const intent = intentRows[0];
  if (!intent) return null;

  const attempts = await db.select()
    .from(paymentAttempts)
    .where(and(
      eq(paymentAttempts.paymentIntentId, intent.id),
      eq(paymentAttempts.merchantId, merchantId)
    ))
    .orderBy(desc(paymentAttempts.createdAt));

  const proofs = [];
  const webhookDeliveriesOut = [];

  for (const attempt of attempts) {
    const proofRows = await db.select()
      .from(proofVault)
      .where(eq(proofVault.paymentAttemptId, attempt.id))
      .orderBy(desc(proofVault.createdAt));

    for (const proof of proofRows) {
      proofs.push({
        id: proof.id,
        proof_id: proof.proofId,
        payment_attempt_id: proof.paymentAttemptId,
        merchant_reference: proof.merchantReference,
        proof_hash: proof.proofHash,
        hash_algorithm: proof.hashAlgorithm,
        proof_status: proof.proofStatus,
        signature: proof.signature,
        signature_algorithm: proof.signatureAlgorithm,
        evidence_bundle_uri: proof.evidenceBundleUri,
        created_at: proof.createdAt
      });
    }

    const deliveryRows = await db.select()
      .from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.merchantId, merchantId),
        eq(webhookDeliveries.eventId, attempt.id)
      ))
      .orderBy(desc(webhookDeliveries.createdAt));

    for (const delivery of deliveryRows) {
      webhookDeliveriesOut.push({
        id: delivery.id,
        endpoint_id: delivery.endpointId,
        event_type: delivery.eventType,
        event_id: delivery.eventId,
        status: delivery.status,
        attempts: delivery.attempts,
        last_http_status: delivery.lastHttpStatus,
        last_error: delivery.lastError,
        delivered_at: delivery.deliveredAt,
        created_at: delivery.createdAt,
        updated_at: delivery.updatedAt
      });
    }
  }

  return {
    payment: {
      id: intent.id,
      merchant_reference: intent.merchantReference,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      payment_method_type: intent.paymentMethodType,
      payment_token_ref: intent.paymentTokenRef,
      customer_ref: intent.customerRef,
      customer_email: intent.customerEmail,
      description: intent.description,
      channel: intent.channel ?? 'api',
      terminal_id: intent.terminalId ?? null,
      device_id: intent.deviceId ?? null,
      processor: intent.processor,
      created_at: intent.createdAt,
      updated_at: intent.updatedAt
    },
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      payment_intent_id: attempt.paymentIntentId,
      action: attempt.action,
      processor: attempt.processor,
      status: attempt.status,
      processor_transaction_id: attempt.processorTransactionId,
      processor_status: attempt.processorStatus,
      processor_http_status: attempt.processorHttpStatus,
      error_message: attempt.errorMessage,
      created_at: attempt.createdAt,
      updated_at: attempt.updatedAt
    })),
    proofs,
    webhook_deliveries: webhookDeliveriesOut
  };
}
