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

}
