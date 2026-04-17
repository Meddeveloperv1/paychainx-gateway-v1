import { FastifyInstance } from 'fastify';
import { listTransactions, getTransactionSummary } from './reporting-service.js';

export async function registerReportingRoutes(app: FastifyInstance) {

  app.get('/v1/transactions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = request.query as any;

    const data = await listTransactions(request.auth!.merchantId, {
      status: query.status,
      processor: query.processor,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined
    });

    return reply.send({ ok: true, data });
  });

  app.get('/v1/transactions/summary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const summary = await getTransactionSummary(request.auth!.merchantId);
    return reply.send({ ok: true, summary });
  });

}
