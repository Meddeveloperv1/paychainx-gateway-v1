import { FastifyInstance } from 'fastify';
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  disableWebhookEndpoint,
  listWebhookDeliveries
} from './service.js';

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.get('/v1/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const endpoints = await listWebhookEndpoints(request.auth!.merchantId);
    return reply.send({ ok: true, endpoints });
  });

  app.post('/v1/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = (request.body as any) ?? {};
    const endpoint = await createWebhookEndpoint({
      merchantId: request.auth!.merchantId,
      url: body.url,
      eventTypes: Array.isArray(body.event_types) ? body.event_types : ['payment.succeeded', 'payment.failed', 'proof.generated'],
      signingSecret: body.signing_secret ?? null
    });
    return reply.send({ ok: true, endpoint });
  });

  app.post('/v1/webhooks/:id/disable', { preHandler: [app.authenticate] }, async (request, reply) => {
    const endpointId = (request.params as any).id;
    await disableWebhookEndpoint(request.auth!.merchantId, endpointId);
    return reply.send({ ok: true, endpoint_id: endpointId, disabled: true });
  });

  app.get('/v1/webhooks/deliveries', { preHandler: [app.authenticate] }, async (request, reply) => {
    const deliveries = await listWebhookDeliveries(request.auth!.merchantId);
    return reply.send({ ok: true, deliveries });
  });
}
