import 'fastify';
import type { db } from '../db/client.js';

type AuthContext = {
  merchantId: string;
  merchantName: string;
  merchantStatus: string;
  apiKeyId: string;
  apiKeyLabel: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    enforceIdempotency: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }

  interface FastifyRequest {
    auth: AuthContext | null;
  }
}
