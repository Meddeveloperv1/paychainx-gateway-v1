import { FastifyInstance } from 'fastify';
import { createSale } from '../payments/service.js';

export async function registerPropelrRoutes(app: FastifyInstance) {
  app.post('/v1/integrations/propelr/sale', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = (request.body as any) ?? {};

    if (!body.reference) {
      return reply.code(400).send({ ok: false, error: 'MISSING_REFERENCE' });
    }

    if (!body.amount || !Number.isInteger(body.amount) || body.amount <= 0) {
      return reply.code(400).send({ ok: false, error: 'INVALID_AMOUNT' });
    }

    if (!body.currency) {
      return reply.code(400).send({ ok: false, error: 'MISSING_CURRENCY' });
    }

    if (!body.terminal_id) {
      return reply.code(400).send({ ok: false, error: 'MISSING_TERMINAL_ID' });
    }

    if (!body.device_id) {
      return reply.code(400).send({ ok: false, error: 'MISSING_DEVICE_ID' });
    }

    if (!body.token_id) {
      return reply.code(400).send({ ok: false, error: 'MISSING_TOKEN_ID' });
    }

    const mapped = {
      merchant_reference: body.reference,
      amount: body.amount,
      currency: String(body.currency).toUpperCase(),
      channel: 'terminal',
      terminal_id: body.terminal_id,
      device_id: body.device_id,
      payment_source: {
        type: 'stored_token',
        token_id: body.token_id
      },
      customer: body.customer ? {
        customer_ref: body.customer.customer_ref,
        email: body.customer.email
      } : undefined,
      description: body.description,
      metadata: {
        partner: 'propelr',
        store_id: body.store_id ?? null,
        lane_id: body.lane_id ?? null,
        operator_id: body.operator_id ?? null,
        session_id: body.session_id ?? null
      }
    };

    const result = await createSale(request.auth!, mapped as any);

    return reply.send({
      ok: true,
      partner: 'propelr',
      mapped_request: {
        reference: body.reference,
        terminal_id: body.terminal_id,
        device_id: body.device_id,
        store_id: body.store_id ?? null,
        lane_id: body.lane_id ?? null,
        operator_id: body.operator_id ?? null,
        session_id: body.session_id ?? null
      },
      result
    });
  });
}
