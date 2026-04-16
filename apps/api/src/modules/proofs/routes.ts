import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { proofVault } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function registerProofRoutes(app: FastifyInstance) {

  app.get('/v1/proofs/:proof_id', async (request, reply) => {
    const proofId = (request.params as any).proof_id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.proofId, proofId))
      .limit(1);

    return reply.send(rows[0] ?? null);
  });

  app.get('/v1/payments/:id/proof', async (request, reply) => {
    const id = (request.params as any).id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.paymentAttemptId, id))
      .limit(1);

    return reply.send(rows[0] ?? null);
  });

  app.get('/v1/merchants/:id/proofs', async (request, reply) => {
    const id = (request.params as any).id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.merchantId, id));

    return reply.send(rows);
  });
}
