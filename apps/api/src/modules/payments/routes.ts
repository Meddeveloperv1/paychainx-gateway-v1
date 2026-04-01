import { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { idempotencyKeys } from '../../db/schema.js';
import { saleRequestSchema } from './schemas.js';
import { createSale } from './service.js';
import { writeAuditEvent } from '../audit/service.js';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/payments/sale', {
    preHandler: [
      app.authenticate,
      app.enforceIdempotency
    ],
    schema: {
      tags: ['Payments'],
      summary: 'Create a sale payment intent',
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['merchant_reference', 'amount', 'currency', 'payment_method'],
        properties: {
          merchant_reference: { type: 'string' },
          amount: { type: 'integer' },
          currency: { type: 'string' },
          payment_method: {
            type: 'object',
            required: ['type', 'token_ref'],
            properties: {
              type: { type: 'string', enum: ['card_token'] },
              token_ref: { type: 'string' }
            }
          },
          customer: {
            type: 'object',
            properties: {
              customer_ref: { type: 'string' },
              email: { type: 'string' }
            }
          },
          description: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            merchant_reference: { type: 'string' },
            status: { type: 'string' },
            amount: { type: 'integer' },
            currency: { type: 'string' },
            processor: { type: 'string' },
            processor_transaction_id: { type: ['string', 'null'] },
            payment_attempt_id: { type: 'string' },
            created_at: { type: 'string' },
            error_message: { type: ['string', 'null'] }
          }
        }
      }
    }
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

    return result;
  });
}
