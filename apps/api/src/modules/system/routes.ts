import { FastifyInstance } from 'fastify';
import { getAuditQueueDepth, getPQProofStatus } from '../audit/audit-queue.js';
import { getPQSidecarHealth } from '../pq/sidecar-client.js';

export async function registerSystemRoutes(app: FastifyInstance) {
  app.get('/v1/system/status', async (_request, reply) => {
    const pqSidecar = await getPQSidecarHealth();

    return reply.send({
      ok: true,
      build_label: process.env.BUILD_LABEL ?? null,
      build_version: process.env.BUILD_VERSION ?? null,
      active_branch: process.env.ACTIVE_BRANCH ?? null,
      gateway_fast_mode: process.env.GATEWAY_FAST_MODE === 'true',
      route_cache_enabled: process.env.ROUTE_CACHE_ENABLED === 'true',
      credential_cache_enabled: process.env.CREDENTIAL_CACHE_ENABLED === 'true',
      idempotency_cache_enabled: process.env.IDEMPOTENCY_CACHE_ENABLED === 'true',
      redis_idempotency_enabled: process.env.REDIS_IDEMPOTENCY_ENABLED === 'true',
      default_processor: process.env.DEFAULT_PROCESSOR ?? 'cybersource',
      bank_rail_enabled: process.env.BANK_RAIL_ENABLED === 'true',
      pq_enabled: process.env.PQ_ENABLED === 'true',
      pq_audit_only: process.env.PQ_AUDIT_ONLY !== 'false',
      pq_strict_mode: process.env.PQ_STRICT_MODE === 'true',
      audit_queue_enabled: process.env.AUDIT_QUEUE_ENABLED === 'true',
      audit_queue_depth: getAuditQueueDepth(),
      pq_sidecar: pqSidecar
    });
  });

  app.get('/v1/pq/status/:merchantReference', async (request, reply) => {
    const merchantReference = (request.params as { merchantReference: string }).merchantReference;
    const status = getPQProofStatus(merchantReference);

    return reply.send({
      ok: true,
      merchant_reference: merchantReference,
      pq_proof: status
    });
  });

  app.get('/v1/system/whoami', { preHandler: [app.authenticate] }, async (request, reply) => {
    return reply.send({
      ok: true,
      auth: request.auth ?? null
    });
  });
}
