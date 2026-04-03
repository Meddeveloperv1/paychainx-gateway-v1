import { getPqMetadata } from "./config.js";
import { signPqEnvelope } from "./signer.js";
import { verifyPqEnvelope } from "./verifier.js";
import { pqSidecarHealth, pqSidecarSign, pqSidecarVerify } from "./client.js";

export async function buildHybridAuditEnvelope(input: any, result: any, audit: any, policyResult?: any) {
  const pq = getPqMetadata();

  const payload = {
    input,
    result,
    audit,
    pq,
    pq_policy: policyResult || null
  };

  const sidecar = await pqSidecarHealth();

  let signed: any;
  let verified: any;

  if (sidecar.available) {
    signed = await pqSidecarSign(payload);
    verified = await pqSidecarVerify(payload, signed.pq_hash, signed.pq_signature);
  } else {
    signed = signPqEnvelope(payload);
    verified = verifyPqEnvelope(payload, signed.pq_hash, signed.pq_signature);
  }

  return {
    ...audit,
    pq,
    pq_provider: sidecar.available ? sidecar.provider : "in-process-fallback",
    pq_hash: signed.pq_hash,
    pq_signature: signed.pq_signature,
    pq_key_fingerprint: signed.pq_key_fingerprint,
    pq_policy: policyResult || null,
    pq_verification: verified,
    hybrid_attestation: {
      classical_audit_present: true,
      pq_ready: pq.pq_mode !== "off",
      pq_enforced: pq.pq_mode === "hybrid-enforced",
      hybrid_verified: verified.pq_valid === true
    }
  };
}
