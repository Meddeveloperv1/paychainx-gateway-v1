import { FastifyInstance } from 'fastify';

export async function registerIntegrationRoutes(app: FastifyInstance) {

  app.get('/v1/integration/info', async (request, reply) => {
    return reply.send({
      ok: true,
      integration: {
        name: "PaychainX Gateway",
        version: "1.0",
        auth: {
          type: "api_key",
          header: "x-api-key"
        },
        endpoints: {
          sale: "POST /v1/payments/sale",
          auth: "POST /v1/payments/auth",
          capture: "POST /v1/payments/capture",
          refund: "POST /v1/payments/refund"
        },
        required_fields: [
          "merchant_reference",
          "amount",
          "currency",
          "channel",
          "terminal_id",
          "device_id",
          "payment_source"
        ],
        example_request: {
          merchant_reference: "order_123",
          amount: 1111,
          currency: "USD",
          channel: "terminal",
          terminal_id: "term_001",
          device_id: "device_001",
          payment_source: {
            type: "stored_token",
            token_id: "ptok_xxx"
          }
        },
        example_response: {
          id: "payment_id",
          status: "captured",
          processor_transaction_id: "txn_id",
          channel: "terminal"
        },
        webhooks: {
          events: [
            "payment.succeeded",
            "payment.failed"
          ],
          signing: "HMAC-SHA256"
        }
      }
    });
  });

}
