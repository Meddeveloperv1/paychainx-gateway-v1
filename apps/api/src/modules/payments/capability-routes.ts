import { FastifyInstance } from 'fastify';
import { getMerchantCapabilities, upsertMerchantCapabilities } from './merchant-capabilities.js';

export async function registerMerchantCapabilityRoutes(app: FastifyInstance) {
  app.get('/v1/merchants/:id/capabilities', async (request, reply) => {
    const merchantId = (request.params as any).id;
    const caps = await getMerchantCapabilities(merchantId);
    return reply.send({
      ok: true,
      merchant_id: merchantId,
      capabilities: caps
    });
  });

  app.post('/v1/merchants/:id/capabilities', async (request, reply) => {
    const merchantId = (request.params as any).id;
    const body = (request.body as any) ?? {};

    const caps = await upsertMerchantCapabilities({
      merchantId,
      allowedCurrencies: Array.isArray(body.allowed_currencies) ? body.allowed_currencies : ['USD'],
      allowedChannels: Array.isArray(body.allowed_channels) ? body.allowed_channels : ['ECOM'],
      defaultProcessor: body.default_processor === 'bank_rail' ? 'bank_rail' : 'cybersource',
      cybersourceEnabled: body.cybersource_enabled !== false,
      bankRailEnabled: body.bank_rail_enabled === true,
      pqEnabled: body.pq_enabled !== false,
      pqStrictMode: body.pq_strict_mode === true
    });

    return reply.send({
      ok: true,
      merchant_id: merchantId,
      capabilities: caps
    });
  });
}
