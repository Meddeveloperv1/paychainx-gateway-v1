import { FastifyInstance } from 'fastify';
import {
  createStoredToken,
  getStoredToken,
  listStoredTokens,
  revokeStoredToken
} from './service.js';

export async function registerTokenRoutes(app: FastifyInstance) {
  app.post('/v1/tokens', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await createStoredToken(request.auth!, request.body as any);
    return reply.send(result);
  });

  app.get('/v1/tokens', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await listStoredTokens(request.auth!);
    return reply.send({ ok: true, data: result });
  });

  app.get('/v1/tokens/:tokenId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tokenId = (request.params as any).tokenId;
    const result = await getStoredToken(request.auth!, tokenId);
    if (!result) {
      return reply.code(404).send({ ok: false, error: 'TOKEN_NOT_FOUND' });
    }
    return reply.send(result);
  });

  app.post('/v1/tokens/:tokenId/revoke', { preHandler: [app.authenticate] }, async (request, reply) => {
    const tokenId = (request.params as any).tokenId;
    const result = await revokeStoredToken(request.auth!, tokenId);
    if (!result) {
      return reply.code(404).send({ ok: false, error: 'TOKEN_NOT_FOUND' });
    }
    return reply.send(result);
  });
}
