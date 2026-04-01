import { FastifyInstance } from 'fastify';
import { saleRequestSchema } from './schemas.js';
import { createSale } from './service.js';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/payments/sale', {
    preHandler: app.authenticate,
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
            payment_attempt_id: { type: 'string' },
            created_at: { type: 'string' }
          }
        }
      }
    }
  }, async (request) => {
    const parsed = saleRequestSchema.parse(request.body);
    return createSale(request.auth!, parsed);
  });
}
