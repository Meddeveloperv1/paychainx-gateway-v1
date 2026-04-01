import { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { idempotencyKeys } from '../../db/schema.js';
import {
  saleRequestSchema,
  captureRequestSchema,
  voidRequestSchema,
  refundRequestSchema
} from './schemas.js';
import {
  createSale,
  capturePayment,
  voidPayment,
  refundPayment
} from './service.js';
import { writeAuditEvent } from '../audit/service.js';

async function completeIdempotency(app: FastifyInstance, request: any, result: unknown) {
  const idemHeader = request.headers['idempotency-key'];
  if (idemHeader && !Array.isArray(idemHeader) && request.auth?.merchantId) {
    await app.db.update(idempotencyKeys)
      .set({
        status: 'completed',
        responseCode: '200',
        responseBody: JSON.stringify(result),
        updatedAt: new Date()
      })
      .where(and(
        eq(idempotencyKeys.merchantId, request.auth.merchantId),
        eq(idempotencyKeys.idempotencyKey, idemHeader),
        eq(idempotencyKeys.routeKey, `${request.method}:${request.routerPath ?? request.url}`)
      ));
  }
}

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/payments/sale', {
    preHandler: [app.authenticate, app.enforceIdempotency]
  }, async (request) => {
    const parsed = saleRequestSchema.parse(request.body);

    await writeAuditEvent({
      merchantId: request.auth?.merchantId,
      requestId: request.id,
      route: request.url,
      httpMethod: request.method,
      eventType: 'payment.sale.requested',
      payload: parsed
    });

    const result = await createSale(request.auth!, parsed);

    await writeAuditEvent({
      merchantId: request.auth?.merchantId,
      requestId: request.id,
      route: request.url,
      httpMethod: request.method,
      eventType: 'payment.sale.completed',
      payload: result
    });

    await completeIdempotency(app, request, result);
    return result;
  });

  app.post('/payments/capture', {
    preHandler: [app.authenticate, app.enforceIdempotency]
  }, async (request) => {
    const parsed = captureRequestSchema.parse(request.body);
    const result = await capturePayment(request.auth!, parsed);
    await completeIdempotency(app, request, result);
    return result;
  });

  app.post('/payments/void', {
    preHandler: [app.authenticate, app.enforceIdempotency]
  }, async (request) => {
    const parsed = voidRequestSchema.parse(request.body);
    const result = await voidPayment(request.auth!, parsed);
    await completeIdempotency(app, request, result);
    return result;
  });

  app.post('/payments/refund', {
    preHandler: [app.authenticate, app.enforceIdempotency]
  }, async (request) => {
    const parsed = refundRequestSchema.parse(request.body);
    const result = await refundPayment(request.auth!, parsed);
    await completeIdempotency(app, request, result);
    return result;
  });
}
