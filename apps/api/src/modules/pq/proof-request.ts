import crypto from 'node:crypto';
import type { PQProofRequest } from './sidecar-client.js';

export function buildPQProofRequest(input: {
  merchantId: string;
  merchantReference: string;
  paymentIntentId?: string;
  paymentAttemptId?: string;
  amount: number;
  currency: string;
  processor: string;
  requestedProcessor?: string | null;
  body: unknown;
}): PQProofRequest {
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(input.body))
    .digest('hex');

  return {
    merchantId: input.merchantId,
    merchantReference: input.merchantReference,
    paymentIntentId: input.paymentIntentId,
    paymentAttemptId: input.paymentAttemptId,
    amount: input.amount,
    currency: input.currency,
    processor: input.processor,
    requestedProcessor: input.requestedProcessor ?? null,
    payloadHash,
    createdAt: new Date().toISOString()
  };
}
