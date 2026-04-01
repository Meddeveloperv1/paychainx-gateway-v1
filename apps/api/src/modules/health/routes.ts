import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            service: { type: 'string' },
            environment: { type: 'string' }
          }
        }
      }
    }
  }, async () => {
    return {
      ok: true,
      service: 'paychainx-gateway-v1',
      environment: process.env.NODE_ENV ?? 'development'
    };
  });

  app.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check',
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' }
          }
        }
      }
    }
  }, async () => {
    return { ok: true };
  });
}
