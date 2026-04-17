import crypto from 'node:crypto';
import { db } from '../../db/client.js';
import { webhookEndpoints, webhookDeliveries } from '../../db/schema.js';
import { eq, and, lte, asc } from 'drizzle-orm';

function nowDate() {
  return new Date();
}

function parseEventTypes(value: string) {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

export async function listWebhookEndpoints(merchantId: string) {
  return db.select().from(webhookEndpoints).where(eq(webhookEndpoints.merchantId, merchantId));
}

export async function createWebhookEndpoint(input: {
  merchantId: string;
  url: string;
  eventTypes: string[];
  signingSecret?: string | null;
}) {
  const generatedSecret = input.signingSecret ?? crypto.randomBytes(32).toString('hex');

  const inserted = await db.insert(webhookEndpoints).values({
    merchantId: input.merchantId,
    url: input.url,
    eventTypes: input.eventTypes.join(','),
    isEnabled: true,
    signingSecret: generatedSecret,
    createdAt: nowDate(),
    updatedAt: nowDate()
  }).returning();

  return inserted[0];
}

export async function disableWebhookEndpoint(merchantId: string, endpointId: string) {
  await db.update(webhookEndpoints)
    .set({ isEnabled: false, updatedAt: nowDate() })
    .where(and(
      eq(webhookEndpoints.id, endpointId),
      eq(webhookEndpoints.merchantId, merchantId)
    ));
}

export async function enqueueWebhookEvent(input: {
  merchantId: string;
  eventType: string;
  eventId: string;
  payload: unknown;
}) {
  if (process.env.WEBHOOKS_ENABLED !== 'true') return;

  const endpoints = await db.select().from(webhookEndpoints)
    .where(and(
      eq(webhookEndpoints.merchantId, input.merchantId),
      eq(webhookEndpoints.isEnabled, true)
    ));

  const payloadText = JSON.stringify(input.payload);

  for (const endpoint of endpoints) {
    const allowed = parseEventTypes(endpoint.eventTypes);
    if (!allowed.includes(input.eventType)) continue;

    await db.insert(webhookDeliveries).values({
      merchantId: input.merchantId,
      endpointId: endpoint.id,
      eventType: input.eventType,
      eventId: input.eventId,
      payload: payloadText,
      status: 'queued',
      attempts: 0,
      nextAttemptAt: nowDate(),
      createdAt: nowDate(),
      updatedAt: nowDate()
    });
  }
}

function buildSignature(secret: string, payload: string, timestamp: string) {
  const signed = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signed).digest('hex');
}

export async function fetchNextQueuedDelivery() {
  const rows = await db.select()
    .from(webhookDeliveries)
    .where(and(
      eq(webhookDeliveries.status, 'queued'),
      lte(webhookDeliveries.nextAttemptAt, nowDate())
    ))
    .orderBy(asc(webhookDeliveries.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function markDeliveryProcessing(id: string) {
  await db.update(webhookDeliveries)
    .set({ status: 'processing', updatedAt: nowDate() })
    .where(eq(webhookDeliveries.id, id));
}

export async function markDeliveryDelivered(id: string, attempts: number, httpStatus: number) {
  await db.update(webhookDeliveries)
    .set({
      status: 'delivered',
      attempts,
      lastHttpStatus: httpStatus,
      deliveredAt: nowDate(),
      updatedAt: nowDate()
    })
    .where(eq(webhookDeliveries.id, id));
}

export async function markDeliveryRetry(id: string, attempts: number, httpStatus: number | null, err: string) {
  const delayMs = Math.min(60000, 2000 * attempts);
  const nextAttempt = new Date(Date.now() + delayMs);

  await db.update(webhookDeliveries)
    .set({
      status: attempts >= 5 ? 'failed' : 'queued',
      attempts,
      lastHttpStatus: httpStatus,
      lastError: err,
      nextAttemptAt: nextAttempt,
      updatedAt: nowDate()
    })
    .where(eq(webhookDeliveries.id, id));
}

export async function processOneWebhookDelivery() {
  const job = await fetchNextQueuedDelivery();
  if (!job) return { processed: false };

  await markDeliveryProcessing(job.id);

  const endpointRows = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, job.endpointId)).limit(1);
  const endpoint = endpointRows[0];
  if (!endpoint || !endpoint.isEnabled) {
    await markDeliveryRetry(job.id, (job.attempts ?? 0) + 1, null, 'endpoint missing or disabled');
    return { processed: true, ok: false };
  }

  const attempts = (job.attempts ?? 0) + 1;
  const secret = endpoint.signingSecret;
  if (!secret) throw new Error('WEBHOOK_SECRET_MISSING');
  const timestamp = Date.now().toString();
  const signature = buildSignature(secret, job.payload, timestamp);

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paychainx-event-type': job.eventType,
        'x-paychainx-event-id': job.eventId,
        'x-paychainx-signature': signature,
        'x-paychainx-timestamp': timestamp
      },
      body: job.payload
    });

    if (res.ok) {
      await markDeliveryDelivered(job.id, attempts, res.status);
      return { processed: true, ok: true };
    }

    await markDeliveryRetry(job.id, attempts, res.status, `http_${res.status}`);
    return { processed: true, ok: false };
  } catch (err) {
    await markDeliveryRetry(job.id, attempts, null, err instanceof Error ? err.message : 'webhook delivery failed');
    return { processed: true, ok: false };
  }
}

export async function listWebhookDeliveries(merchantId: string) {
  return db.select().from(webhookDeliveries).where(eq(webhookDeliveries.merchantId, merchantId));
}
