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

}
