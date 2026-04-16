import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { proofVault, paymentAttempts } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function buildVerificationResult(row: any) {
  const ok = row?.proofStatus === 'submitted' || row?.proofStatus === 'verified';
  return {
    ok,
    proof_id: row?.proofId ?? null,
    merchant_reference: row?.merchantReference ?? null,
    proof_status: row?.proofStatus ?? null,
    hash_algorithm: row?.hashAlgorithm ?? null,
    proof_hash: row?.proofHash ?? null,
    signature_algorithm: row?.signatureAlgorithm ?? null,
    verified_at: row?.verifiedAt ?? null,
    verification_result: ok ? 'valid-record-present' : 'not-valid'
  };
}

function buildReceipt(row: any) {
  return {
    receipt_type: 'paychainx_pq_cryptographic_receipt',
    proof_id: row?.proofId ?? null,
    payment_attempt_id: row?.paymentAttemptId ?? null,
    merchant_reference: row?.merchantReference ?? null,
    proof_hash: row?.proofHash ?? null,
    hash_algorithm: row?.hashAlgorithm ?? null,
    signature: row?.signature ?? null,
    signature_algorithm: row?.signatureAlgorithm ?? null,
    proof_status: row?.proofStatus ?? null,
    created_at: row?.createdAt ?? null,
    verified_at: row?.verifiedAt ?? null,
    policy_snapshot: row?.policySnapshot ? JSON.parse(row.policySnapshot) : null,
    request_fingerprint: row?.requestFingerprint ?? null,
    processor_response_fingerprint: row?.processorResponseFingerprint ?? null,
    sidecar_version: row?.sidecarVersion ?? null,
    evidence_bundle_uri: row?.evidenceBundleUri ?? null
  };
}

export async function registerProofRoutes(app: FastifyInstance) {
  app.get('/v1/proofs/:proof_id', async (request, reply) => {
    const proofId = (request.params as any).proof_id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.proofId, proofId))
      .limit(1);

    return reply.send(rows[0] ?? null);
  });

  app.get('/v1/payments/:id/proof', async (request, reply) => {
    const paymentAttemptId = (request.params as any).id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.paymentAttemptId, paymentAttemptId))
      .limit(1);

    return reply.send(rows[0] ?? null);
  });

  app.get('/v1/merchants/:id/proofs', async (request, reply) => {
    const merchantId = (request.params as any).id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.merchantId, merchantId));

    return reply.send(rows);
  });

  app.get('/v1/proofs/verify/:proof_id', async (request, reply) => {
    const proofId = (request.params as any).proof_id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.proofId, proofId))
      .limit(1);

    return reply.send(buildVerificationResult(rows[0] ?? null));
  });

  app.post('/v1/proofs/verify', async (request, reply) => {
    const body = (request.body as any) ?? {};
    const proofId = body.proof_id;

    if (!proofId) {
      return reply.code(400).send({
        ok: false,
        error: 'proof_id required'
      });
    }

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.proofId, proofId))
      .limit(1);

    return reply.send(buildVerificationResult(rows[0] ?? null));
  });

  app.get('/v1/proofs/:proof_id/receipt', async (request, reply) => {
    const proofId = (request.params as any).proof_id;

    const rows = await db.select().from(proofVault)
      .where(eq(proofVault.proofId, proofId))
      .limit(1);

    const row = rows[0] ?? null;
    if (!row) {
      return reply.code(404).send({ ok: false, error: 'proof not found' });
    }

    return reply.send(buildReceipt(row));
  });
}
