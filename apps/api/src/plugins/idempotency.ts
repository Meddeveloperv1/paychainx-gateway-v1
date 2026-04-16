import fp from 'fastify-plugin';
import { and, eq } from 'drizzle-orm';
import { idempotencyKeys } from '../db/schema.js';
import {
  getInFlightKey,
  setInFlightKey,
  clearInFlightKey,
  getCachedResponse,
  setCachedResponse
} from '../modules/cache/idempotency-cache.js';
import {
  redisHasInFlight,
  redisSetInFlight,
  redisClearInFlight,
  redisGetResponse,
  redisSetResponse
} from '../modules/cache/idempotency-redis.js';

export default fp(async function idempotencyPlugin(app) {
  app.decorate('enforceIdempotency', async function (request, reply) {
    const idemHeader = request.headers['idempotency-key'];

    if (!idemHeader || typeof idemHeader !== 'string') {
      return reply.code(400).send({
        error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Missing Idempotency-Key header' }
      });
    }

    if (!request.auth) {
      return reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing auth context' }
      });
    }

    const routeKey = `${request.method}:${request.url}`;
    const payloadHash = JSON.stringify(request.body ?? {});

    const redisCached = await redisGetResponse(idemHeader);
    if (redisCached) {
      reply.header('x-paychainx-idempotency', 'replay-redis');
      return reply.code(redisCached.statusCode).send(redisCached.body);
    }

    const memCached = getCachedResponse(idemHeader);
    if (memCached) {
      reply.header('x-paychainx-idempotency', 'replay-memory');
      return reply.code(memCached.statusCode).send(memCached.body);
    }

    const redisInFlight = await redisHasInFlight(idemHeader);
    if (redisInFlight) {
      return reply.code(409).send({
        error: { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'Request with this idempotency key is already being processed' }
      });
    }

    const redisLocked = await redisSetInFlight(idemHeader);
    if (!redisLocked) {
      if (getInFlightKey(idemHeader)) {
        return reply.code(409).send({
          error: { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'Request with this idempotency key is already being processed' }
        });
      }
      setInFlightKey(idemHeader);
    }

    const originalSend = reply.send.bind(reply);
    reply.send = function (payload: unknown) {
      const code = reply.statusCode || 200;
      if (code < 500) {
        setCachedResponse(idemHeader, code, payload);
        void redisSetResponse(idemHeader, code, payload);
      }
      clearInFlightKey(idemHeader);
      void redisClearInFlight(idemHeader);
      return originalSend(payload);
    };

    try {
      const existing = await app.db.select()
        .from(idempotencyKeys)
        .where(and(
          eq(idempotencyKeys.merchantId, request.auth.merchantId),
          eq(idempotencyKeys.idempotencyKey, idemHeader),
          eq(idempotencyKeys.routeKey, routeKey)
        ))
        .limit(1);

      const row = existing[0];

      if (row) {
        if (row.requestHash !== payloadHash) {
          clearInFlightKey(idemHeader);
          void redisClearInFlight(idemHeader);
          return reply.code(409).send({
            error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key was already used with a different request payload' }
          });
        }

        if (row.status === 'completed' && row.responseBody) {
          const parsed = JSON.parse(row.responseBody);
          setCachedResponse(idemHeader, Number(row.responseCode ?? 200), parsed);
          void redisSetResponse(idemHeader, Number(row.responseCode ?? 200), parsed);
          clearInFlightKey(idemHeader);
          void redisClearInFlight(idemHeader);
          reply.header('x-paychainx-idempotency', 'replay-db');
          return reply.code(Number(row.responseCode ?? 200)).send(parsed);
        }

        if (row.status === 'in_progress') {
          clearInFlightKey(idemHeader);
          void redisClearInFlight(idemHeader);
          return reply.code(409).send({
            error: { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'Request with this idempotency key is already being processed' }
          });
        }
      }

      await app.db.insert(idempotencyKeys).values({
        merchantId: request.auth.merchantId,
        idempotencyKey: idemHeader,
        routeKey,
        requestHash: payloadHash,
        status: 'in_progress'
      }).onConflictDoNothing();
    } catch (error) {
      clearInFlightKey(idemHeader);
      void redisClearInFlight(idemHeader);
      throw error;
    }
  });
});
