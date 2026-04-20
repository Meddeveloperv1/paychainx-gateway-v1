import { FastifyInstance } from 'fastify';

export async function registerPropelrContractRoutes(app: FastifyInstance) {
  app.get('/v1/integrations/propelr/contract', async (_request, reply) => {
    return reply.send({
      ok: true,
      partner: 'propelr',
      inbound: {
        sale_endpoint: 'POST /v1/integrations/propelr/sale',
        auth_header: 'x-api-key',
        required_fields: [
          'reference',
          'amount',
          'currency',
          'terminal_id',
          'device_id',
          'token_id'
        ],
        optional_fields: [
          'description',
          'customer.customer_ref',
          'customer.email',
          'store_id',
          'lane_id',
          'operator_id',
          'session_id'
        ],
        example_request: {
          reference: 'propelr_order_123',
          amount: 1111,
          currency: 'USD',
          terminal_id: 'term_001',
          device_id: 'device_001',
          token_id: 'ptok_xxx',
          description: 'Terminal sale'
        }
      },
      outbound: {
        webhooks: {
          signing: 'HMAC-SHA256',
          events: [
            {
              event: 'payment.succeeded',
              payload: {
                payment_id: 'payment_id',
                payment_attempt_id: 'attempt_id',
                merchant_reference: 'propelr_order_123',
                status: 'succeeded',
                amount: 1111,
                currency: 'USD',
                processor: 'cybersource'
              }
            },
            {
              event: 'payment.failed',
              payload: {
                payment_id: 'payment_id',
                payment_attempt_id: 'attempt_id',
                merchant_reference: 'propelr_order_123',
                status: 'failed',
                amount: 1111,
                currency: 'USD',
                processor: 'cybersource'
              }
            }
          ]
        }
      },
      responses: {
        success: {
          ok: true,
          partner: 'propelr',
          result: {
            id: 'payment_id',
            status: 'captured',
            processor_transaction_id: 'txn_id',
            channel: 'terminal'
          }
        },
        failure: {
          ok: false,
          error: {
            code: 'processor_general_failure',
            message: 'Processor returned a general system failure'
          }
        }
      }
    });
  });
}
