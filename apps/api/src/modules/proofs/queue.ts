import { db } from '../../db/client.js';
import { proofJobs, proofVault } from '../../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { submitPQProofRequest, submitPQProofStrict } from '../pq/sidecar-client.js';
import { storeEvidenceBundle } from './storage.js';
import { enqueueWebhookEvent } from '../webhooks/service.js';

export async function enqueueProofJob(input: {
  merchantId: string;
  merchantReference: string;
  paymentIntentId?: string | null;
  paymentAttemptId: string;
  payload: unknown;
  payloadHash: string;
  mode: 'async-audit' | 'strict';
}) {
  await db.insert(proofJobs).values({
    merchantId: input.merchantId,
    merchantReference: input.merchantReference,
    paymentIntentId: input.paymentIntentId ?? null,
    paymentAttemptId: input.paymentAttemptId,
    payload: JSON.stringify(input.payload),
    payloadHash: input.payloadHash,
    mode: input.mode,
    status: 'queued'
  });
}

export async function fetchNextQueuedProofJob() {
  const rows = await db.select()
    .from(proofJobs)
    .where(eq(proofJobs.status, 'queued'))
    .orderBy(asc(proofJobs.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function markProofJobProcessing(jobId: string) {
  await db.update(proofJobs)
    .set({
      status: 'processing',
      updatedAt: new Date()
    })
    .where(eq(proofJobs.id, jobId));
}

export async function markProofJobFailed(jobId: string, attempts: number, error: string) {
  await db.update(proofJobs)
    .set({
      status: 'failed',
      attempts,
      lastError: error,
      updatedAt: new Date()
    })
    .where(eq(proofJobs.id, jobId));
}

export async function markProofJobCompleted(jobId: string, attempts: number) {
  await db.update(proofJobs)
    .set({
      status: 'completed',
      attempts,
      updatedAt: new Date()
    })
    .where(eq(proofJobs.id, jobId));
}

export async function processOneProofJob() {
  const job = await fetchNextQueuedProofJob();
  if (!job) return { processed: false };

  await markProofJobProcessing(job.id);

  const payload = JSON.parse(job.payload);
  const nextAttempts = (job.attempts ?? 0) + 1;

  try {
    const res = job.mode === 'strict'
      ? await submitPQProofStrict(payload)
      : await submitPQProofRequest(payload);

    if (!res.proofId || res.status !== 'submitted') {
      await markProofJobFailed(job.id, nextAttempts, res.error || 'proof submission failed');
      return { processed: true, ok: false };
    }

    const evidence = await storeEvidenceBundle({
      proofId: res.proofId,
      merchantReference: job.merchantReference,
      payload: {
        proof_job: job,
        proof_request: payload,
        sidecar_response: res,
        policy_snapshot: { pq_mode: job.mode },
        generated_at: new Date().toISOString()
      }
    });

    await db.insert(proofVault).values({
      proofId: res.proofId,
      paymentAttemptId: job.paymentAttemptId,
      merchantId: job.merchantId,
      merchantReference: job.merchantReference,
      proofHash: job.payloadHash,
      hashAlgorithm: 'sha256',
      signature: null,
      signatureAlgorithm: null,
      proofStatus: res.status,
      createdAt: new Date(),
      verifiedAt: null,
      policySnapshot: JSON.stringify({ pq_mode: job.mode }),
      requestFingerprint: job.payloadHash,
      processorResponseFingerprint: null,
      sidecarVersion: 'stub-v1',
      evidenceBundleUri: evidence.uri
    });

    await enqueueWebhookEvent({
      merchantId: job.merchantId,
      eventType: 'proof.generated',
      eventId: res.proofId,
      payload: {
        proof_id: res.proofId,
        merchant_reference: job.merchantReference,
        payment_attempt_id: job.paymentAttemptId,
        proof_status: res.status,
        evidence_bundle_uri: evidence.uri
      }
    });

        await markProofJobCompleted(job.id, nextAttempts);
    return { processed: true, ok: true, proofId: res.proofId };
  } catch (err) {
    if (nextAttempts < 3) {
      await db.update(proofJobs)
        .set({
          status: 'queued',
          attempts: nextAttempts,
          lastError: err instanceof Error ? err.message : 'unknown error',
          updatedAt: new Date()
        })
        .where(eq(proofJobs.id, job.id));
    } else {
      await markProofJobFailed(job.id, nextAttempts, err instanceof Error ? err.message : 'unknown error');
    }
    return { processed: true, ok: false };
  }
}
