import fp from 'fastify-plugin';
import { eq, and } from 'drizzle-orm';
import { apiKeys, merchants } from '../db/schema.js';
import { hashApiKey } from '../lib/api-key.js';

export default fp(async (app) => {
  app.decorateRequest('auth', null);

  app.decorate('authenticate', async function (request, reply) {
    const rawApiKey = request.headers['x-api-key'];

    if (!rawApiKey || Array.isArray(rawApiKey)) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing x-api-key header'
        }
      });
    }

    const keyHash = hashApiKey(rawApiKey);

    const rows = await app.db
      .select({
        merchantId: merchants.id,
        merchantName: merchants.name,
        merchantStatus: merchants.status,
        apiKeyId: apiKeys.id,
        apiKeyLabel: apiKeys.label,
        apiKeyStatus: apiKeys.status
      })
      .from(apiKeys)
      .innerJoin(merchants, eq(apiKeys.merchantId, merchants.id))
      .where(and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.status, 'active')
      ))
      .limit(1);

    const record = rows[0];

    if (!record) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        }
      });
    }

    if (record.merchantStatus !== 'active') {
      return reply.code(403).send({
        error: {
          code: 'MERCHANT_INACTIVE',
          message: 'Merchant is inactive'
        }
      });
    }

    await app.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, record.apiKeyId));


    request.auth = {
      merchantId: record.merchantId,
      merchantName: record.merchantName,
      merchantStatus: record.merchantStatus,
      apiKeyId: record.apiKeyId,
      apiKeyLabel: record.apiKeyLabel
    };
  });
});
