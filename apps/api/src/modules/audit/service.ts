import { desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { auditEvents } from '../../db/schema.js';
import { canonicalize } from '../../lib/canonicalize.js';
import { sha256 } from '../../lib/hash.js';

export async function writeAuditEvent(input: {
  merchantId?: string | null;
  requestId: string;
  route: string;
  httpMethod: string;
  eventType: string;
  payload: unknown;
  metadata?: unknown;
}) {
  const payloadCanonical = canonicalize(input.payload);
  const payloadHash = sha256(payloadCanonical);

  const previous = await db.select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(1);

  const previousHash = previous[0]?.eventHash ?? null;
  const eventHash = sha256([
    previousHash ?? '',
    payloadHash,
    input.eventType,
    input.requestId,
    input.route,
    input.httpMethod
  ].join('|'));

  const inserted = await db.insert(auditEvents).values({
    merchantId: input.merchantId ?? null,
    requestId: input.requestId,
    route: input.route,
    httpMethod: input.httpMethod,
    eventType: input.eventType,
    payloadHash,
    previousHash,
    eventHash,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null
  }).returning();

  return inserted[0];
}
