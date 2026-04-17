import { FastifyInstance } from 'fastify';
import { listTransactions, getTransactionSummary, transactionsToCsv } from './reporting-service.js';

export async function registerReportingRoutes(app: FastifyInstance) {

  app.get('/v1/transactions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = request.query as any;

    const data = await listTransactions(request.auth!.merchantId, {
      status: query.status,
      processor: query.processor,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
      date_from: query.date_from,
      date_to: query.date_to
    });

    return reply.send({ ok: true, data });
  });

  app.get('/v1/transactions/summary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = request.query as any;

    const summary = await getTransactionSummary(request.auth!.merchantId, {
      status: query.status,
      processor: query.processor,
      date_from: query.date_from,
      date_to: query.date_to
    });

    return reply.send({ ok: true, summary });
  });

  app.get('/v1/transactions/export', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = request.query as any;

    const result = await listTransactions(request.auth!.merchantId, {
      status: query.status,
      processor: query.processor,
      limit: query.limit ? Number(query.limit) : 1000,
      offset: query.offset ? Number(query.offset) : 0,
      date_from: query.date_from,
      date_to: query.date_to
    });

    const csv = transactionsToCsv(result.data);

    reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', 'attachment; filename="transactions.csv"');

    return reply.send(csv);
  });

}
