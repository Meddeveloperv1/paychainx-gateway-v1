import 'fastify';
import type { db } from '../db/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db;
  }
}
