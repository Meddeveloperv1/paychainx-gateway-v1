import { signPQPayload } from './signer.js';
import { getPQKeyInfo } from './keys.js';

export function buildPQAuditEnvelope(input: {
  merchantReference: string;
  amount: number;
  currency: string;
  processor: string;
  requestedProcessor?: string | null;
}) {
  const sig = signPQPayload(input);
  const key = getPQKeyInfo();

  return {
    pq_enabled: process.env.PQ_ENABLED === 'true',
    pq_audit_only: process.env.PQ_AUDIT_ONLY !== 'false',
    pq_key_id: key.keyId,
    pq_payload_hash: sig.payloadHash,
    pq_signature: sig.signature,
    merchant_reference: input.merchantReference,
    amount: input.amount,
    currency: input.currency,
    processor: input.processor,
    requested_processor: input.requestedProcessor ?? null,
    created_at: new Date().toISOString()
  };
}
