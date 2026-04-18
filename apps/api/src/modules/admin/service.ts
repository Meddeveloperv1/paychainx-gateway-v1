import crypto from 'node:crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { merchants, apiKeys, paymentIntents, paymentAttempts, proofVault, webhookDeliveries, webhookEndpoints } from '../../db/schema.js';
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


export async function searchAdminPayments(
  merchantId: string,
  query: {
    merchant_reference?: string;
    processor_transaction_id?: string;
    status?: string;
    channel?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.min(query.limit ?? 50, 200);
  const offset = query.offset ?? 0;

  const intentRows = await db.select()
    .from(paymentIntents)
    .where(eq(paymentIntents.merchantId, merchantId))
    .orderBy(desc(paymentIntents.createdAt));

  const filtered = [];

  for (const intent of intentRows) {
    if (query.merchant_reference && !intent.merchantReference.includes(query.merchant_reference)) {
      continue;
    }

    if (query.status && intent.status !== query.status) {
      continue;
    }

    if (query.channel && (intent.channel ?? 'api') !== query.channel) {
      continue;
    }

    if (query.date_from && new Date(intent.createdAt) < new Date(query.date_from)) {
      continue;
    }

    if (query.date_to && new Date(intent.createdAt) > new Date(query.date_to)) {
      continue;
    }

    const attempts = await db.select()
      .from(paymentAttempts)
      .where(and(
        eq(paymentAttempts.paymentIntentId, intent.id),
        eq(paymentAttempts.merchantId, merchantId)
      ))
      .orderBy(desc(paymentAttempts.createdAt));

    const latest = attempts[0];

    if (
      query.processor_transaction_id &&
      latest?.processorTransactionId !== query.processor_transaction_id
    ) {
      continue;
    }

    filtered.push({
      id: intent.id,
      merchant_reference: intent.merchantReference,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      processor: intent.processor,
      channel: intent.channel ?? 'api',
      terminal_id: intent.terminalId ?? null,
      device_id: intent.deviceId ?? null,
      payment_method_type: intent.paymentMethodType,
      customer_ref: intent.customerRef,
      customer_email: intent.customerEmail,
      description: intent.description,
      latest_attempt_id: latest?.id ?? null,
      latest_attempt_action: latest?.action ?? null,
      latest_attempt_status: latest?.status ?? null,
      processor_transaction_id: latest?.processorTransactionId ?? null,
      processor_status: latest?.processorStatus ?? null,
      processor_http_status: latest?.processorHttpStatus ?? null,
      last_error: latest?.errorMessage ?? null,
      created_at: intent.createdAt,
      updated_at: intent.updatedAt
    });
  }

  const total_count = filtered.length;
  const data = filtered.slice(offset, offset + limit);
  const next_offset = offset + data.length;
  const has_more = next_offset < total_count;

  return {
    data,
    pagination: {
      total_count,
      limit,
      offset,
      has_more,
      next_offset: has_more ? next_offset : null
    }
  };
}


function makeApiKeyPlain() {
  return `pkx_${crypto.randomBytes(24).toString('hex')}`;
}

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function makeWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

export async function listAdminApiKeys(merchantId: string) {
  const rows = await db.select()
    .from(apiKeys)
    .where(eq(apiKeys.merchantId, merchantId))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    status: row.status,
    last_used_at: row.lastUsedAt,
    created_at: row.createdAt,
    expires_at: row.expiresAt
  }));
}

export async function disableAdminApiKey(merchantId: string, keyId: string) {
  const updated = await db.update(apiKeys)
    .set({ status: 'disabled' })
    .where(and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.merchantId, merchantId)
    ))
    .returning();

  return updated[0] ?? null;
}

export async function rotateAdminApiKey(merchantId: string, keyId: string) {
  const plain = makeApiKeyPlain();
  const hash = sha256(plain);

  const updated = await db.update(apiKeys)
    .set({
      keyHash: hash,
      status: 'active'
    })
    .where(and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.merchantId, merchantId)
    ))
    .returning();

  const row = updated[0];
  if (!row) return null;

  return {
    id: row.id,
    label: row.label,
    status: row.status,
    created_at: row.createdAt,
    rotated_key: plain
  };
}

export async function listAdminWebhookEndpoints(merchantId: string) {
  const rows = await db.select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.merchantId, merchantId))
    .orderBy(desc(webhookEndpoints.createdAt));

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    event_types: row.eventTypes,
    is_enabled: row.isEnabled,
    has_signing_secret: !!row.signingSecret,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }));
}

export async function rotateAdminWebhookSecret(merchantId: string, endpointId: string) {
  const secret = makeWebhookSecret();

  const updated = await db.update(webhookEndpoints)
    .set({
      signingSecret: secret,
      updatedAt: new Date()
    })
    .where(and(
      eq(webhookEndpoints.id, endpointId),
      eq(webhookEndpoints.merchantId, merchantId)
    ))
    .returning();

  const row = updated[0];
  if (!row) return null;

  return {
    id: row.id,
    signing_secret: secret,
    updated_at: row.updatedAt
  };
}

export async function replayAdminWebhookDelivery(merchantId: string, deliveryId: string) {
  const rows = await db.select()
    .from(webhookDeliveries)
    .where(and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.merchantId, merchantId)
    ))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const updated = await db.update(webhookDeliveries)
    .set({
      status: 'queued',
      nextAttemptAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(webhookDeliveries.id, deliveryId))
    .returning();

  return updated[0] ?? null;
}
