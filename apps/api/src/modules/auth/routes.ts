import { FastifyInstance } from 'fastify';
import { getAuthMe } from './service.js';

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/me', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Auth'],
      summary: 'Get current authenticated merchant and API key',
      security: [{ apiKey: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            merchant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' }
              }
            },
            apiKey: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request) => {
    return getAuthMe(request);
  });
}
