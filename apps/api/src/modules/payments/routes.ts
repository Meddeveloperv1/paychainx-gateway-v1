import { FastifyInstance } from 'fastify';
import {
  createSale,
  createAuth,
  capturePayment,
  voidPayment,
  refundPayment,
  getPaymentAttempts
} from './service.js';
import { normalizeGatewayError } from './error-normalizer.js';

export async function registerPaymentRoutes(app: FastifyInstance) {

  app.post('/v1/payments/sale', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await createSale(request.auth!, request.body as any);
      return reply.send(result);
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

  app.post('/v1/payments/auth', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await createAuth(request.auth!, request.body as any);
      return reply.send(result);
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

  app.post('/v1/payments/capture', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await capturePayment(request.auth!, request.body as any);
      return reply.send(result);
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

  app.post('/v1/payments/void', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await voidPayment(request.auth!, request.body as any);
      return reply.send(result);
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

  app.post('/v1/payments/refund', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await refundPayment(request.auth!, request.body as any);
      return reply.send(result);
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

  app.get('/v1/payments/:id/attempts', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const paymentId = (request.params as any).id;
      const attempts = await getPaymentAttempts(paymentId);
      return reply.send({ ok: true, attempts });
    } catch (err) {
      const normalized = normalizeGatewayError(err);
      return reply.code(normalized.statusCode).send(normalized);
    }
  });

}
