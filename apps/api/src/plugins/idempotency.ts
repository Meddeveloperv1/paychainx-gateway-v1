import fp from 'fastify-plugin';
import { and, eq } from 'drizzle-orm';
import { idempotencyKeys } from '../db/schema.js';
import { canonicalize } from '../lib/canonicalize.js';
import { sha256 } from '../lib/hash.js';

export default fp(async (app) => {
  app.decorate('enforceIdempotency', async function (request, reply) {
    const routeKey = `${request.method}:${request.url}`;

    if (!(request.method === 'POST' && request.url.startsWith('/v1/payments/'))) {
      return null;
    }

    const idemHeader = request.headers['idempotency-key'];

    if (!idemHeader || Array.isArray(idemHeader)) {
      return reply.code(400).send({
        error: {
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'Missing Idempotency-Key header'
        }
      });
    }

    if (!request.auth?.merchantId) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing merchant auth context'
        }
      });
    }

    const requestHash = sha256(canonicalize(request.body ?? {}));

    const existing = await app.db.select()
      .from(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.merchantId, request.auth.merchantId),
        eq(idempotencyKeys.idempotencyKey, idemHeader),
        eq(idempotencyKeys.routeKey, routeKey)
      ))
      .limit(1);

    if (existing[0]) {
      if (existing[0].requestHash !== requestHash) {
        return reply.code(409).send({
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency key was already used with a different request payload'
          }
        });
      }

      if (existing[0].status === 'completed' && existing[0].responseBody) {
        reply.header('x-idempotent-replay', 'true');
        return reply.code(Number(existing[0].responseCode ?? 200)).send(JSON.parse(existing[0].responseBody));
      }

      return reply.code(409).send({
        error: {
          code: 'IDEMPOTENCY_IN_PROGRESS',
          message: 'Request with this idempotency key is already being processed'
        }
      });
    }

    const inserted = await app.db.insert(idempotencyKeys).values({
      merchantId: request.auth.merchantId,
      idempotencyKey: idemHeader,
      routeKey,
      requestHash,
      status: 'processing'
    }).returning();

    return inserted[0];
  });
});
