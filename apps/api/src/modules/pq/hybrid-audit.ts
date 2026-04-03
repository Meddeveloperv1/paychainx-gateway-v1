import { getPqMetadata } from "./config.js";
import { signPqEnvelope } from "./signer.js";
import { verifyPqEnvelope } from "./verifier.js";

export function buildHybridAuditEnvelope(input: any, result: any, audit: any, policyResult?: any) {
  const pq = getPqMetadata();

  const payload = {
    input,
    result,
    audit,
    pq,
    pq_policy: policyResult || null
  };

  const signed = signPqEnvelope(payload);
  const verified = verifyPqEnvelope(payload, signed.pq_hash, signed.pq_signature);

  return {
    ...audit,
    pq,
    pq_hash: signed.pq_hash,
    pq_signature: signed.pq_signature,
    pq_key_fingerprint: signed.pq_key_fingerprint,
    pq_policy: policyResult || null,
    pq_verification: verified,
    hybrid_attestation: {
      classical_audit_present: true,
      pq_ready: pq.pq_mode !== "off",
      pq_enforced: pq.pq_mode === "hybrid-enforced",
      hybrid_verified: verified.pq_valid
    }
  };
}
