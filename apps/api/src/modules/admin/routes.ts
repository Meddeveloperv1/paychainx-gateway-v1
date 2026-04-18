import { FastifyInstance } from 'fastify';
import { createMerchant, createMerchantApiKey } from './service.js';

export async function adminRoutes(app: FastifyInstance) {

  app.post('/admin/merchants', async (request) => {
    const body = request.body as { name: string };
    return createMerchant(body);
  });

  app.post('/admin/merchants/:merchantId/api-keys', async (request) => {
    const params = request.params as { merchantId: string };
    return createMerchantApiKey(params.merchantId);
  });


  app.get('/admin/payments/:id/detail', { preHandler: [app.authenticate] }, async (request, reply) => {
    const paymentId = (request.params as any).id;
    const { getAdminPaymentDetail } = await import('./service.js');
    const detail = await getAdminPaymentDetail(request.auth!.merchantId, paymentId);

    if (!detail) {
      return reply.code(404).send({ ok: false, error: 'PAYMENT_NOT_FOUND' });
    }

    return reply.send({ ok: true, detail });
  });


  app.get('/admin/payments/search', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = request.query as any;
    const { searchAdminPayments } = await import('./service.js');

    const result = await searchAdminPayments(request.auth!.merchantId, {
      merchant_reference: query.merchant_reference,
      processor_transaction_id: query.processor_transaction_id,
      status: query.status,
      channel: query.channel,
      date_from: query.date_from,
      date_to: query.date_to,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined
    });

    return reply.send({ ok: true, data: result.data, pagination: result.pagination });
  });



  app.get('/admin/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { listAdminApiKeys } = await import('./service.js');
    const data = await listAdminApiKeys(request.auth!.merchantId);
    return reply.send({ ok: true, data });
  });

  app.post('/admin/api-keys/:id/disable', { preHandler: [app.authenticate] }, async (request, reply) => {
    const keyId = (request.params as any).id;
    const { disableAdminApiKey } = await import('./service.js');
    const result = await disableAdminApiKey(request.auth!.merchantId, keyId);

    if (!result) {
      return reply.code(404).send({ ok: false, error: 'API_KEY_NOT_FOUND' });
    }

    return reply.send({ ok: true, data: result });
  });

  app.post('/admin/api-keys/:id/rotate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const keyId = (request.params as any).id;
    const { rotateAdminApiKey } = await import('./service.js');
    const result = await rotateAdminApiKey(request.auth!.merchantId, keyId);

    if (!result) {
      return reply.code(404).send({ ok: false, error: 'API_KEY_NOT_FOUND' });
    }

    return reply.send({ ok: true, data: result });
  });

  app.get('/admin/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { listAdminWebhookEndpoints } = await import('./service.js');
    const data = await listAdminWebhookEndpoints(request.auth!.merchantId);
    return reply.send({ ok: true, data });
  });

  app.post('/admin/webhooks/:id/rotate-secret', { preHandler: [app.authenticate] }, async (request, reply) => {
    const endpointId = (request.params as any).id;
    const { rotateAdminWebhookSecret } = await import('./service.js');
    const result = await rotateAdminWebhookSecret(request.auth!.merchantId, endpointId);

    if (!result) {
      return reply.code(404).send({ ok: false, error: 'WEBHOOK_ENDPOINT_NOT_FOUND' });
    }

    return reply.send({ ok: true, data: result });
  });

  app.post('/admin/webhooks/deliveries/:id/replay', { preHandler: [app.authenticate] }, async (request, reply) => {
    const deliveryId = (request.params as any).id;
    const { replayAdminWebhookDelivery } = await import('./service.js');
    const result = await replayAdminWebhookDelivery(request.auth!.merchantId, deliveryId);

    if (!result) {
      return reply.code(404).send({ ok: false, error: 'WEBHOOK_DELIVERY_NOT_FOUND' });
    }

    return reply.send({ ok: true, data: result });
  });



  app.get('/admin/merchant/overview', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { getMerchantOverview } = await import('./service.js');
    const result = await getMerchantOverview(request.auth!.merchantId);

    if (!result) {
      return reply.code(404).send({ ok: false, error: 'MERCHANT_NOT_FOUND' });
    }

    return reply.send({ ok: true, data: result });
  });

  app.post('/admin/settings/risk', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = (request.body as any) ?? {};
      const { updateRiskSettings } = await import('./service.js');

      const result = await updateRiskSettings({
        blocked_currencies: Array.isArray(body.blocked_currencies) ? body.blocked_currencies : undefined,
        review_amount_threshold: typeof body.review_amount_threshold === 'number' ? body.review_amount_threshold : undefined,
        high_amount_threshold: typeof body.high_amount_threshold === 'number' ? body.high_amount_threshold : undefined
      });

      return reply.send({ ok: true, data: result, message: 'restart paychainx to apply updated settings' });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: 'SETTINGS_WRITE_FAILED' });
    }
  });

  app.post('/admin/settings/channels', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = (request.body as any) ?? {};
      const { updateChannelSettings } = await import('./service.js');

      const result = await updateChannelSettings({
        moto_enabled: typeof body.moto_enabled === 'boolean' ? body.moto_enabled : undefined,
        terminal_enabled: typeof body.terminal_enabled === 'boolean' ? body.terminal_enabled : undefined
      });

      return reply.send({ ok: true, data: result, message: 'restart paychainx to apply updated settings' });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: 'SETTINGS_WRITE_FAILED' });
    }
  });


}
