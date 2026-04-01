import fp from 'fastify-plugin';
import { db, checkDbConnection } from '../db/client.js';

export default fp(async (app) => {
  app.decorate('db', db);

  app.get('/v1/db-check', async () => {
    const result = await checkDbConnection();
    return { ok: true, dbTime: result.now };
  });
});
