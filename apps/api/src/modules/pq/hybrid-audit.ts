import crypto from "crypto";
import { getPqMetadata } from "./config.js";

export function buildHybridAuditEnvelope(input: any, result: any, audit: any, policyResult?: any) {
  const pq = getPqMetadata();

  const pqDigestInput = JSON.stringify({
    input,
    result,
    audit,
    pq
  });

  const pq_hash = crypto.createHash("sha512").update(pqDigestInput).digest("hex");

  return {
    ...audit,
    pq,
    pq_hash,
    pq_policy: policyResult || null,
    hybrid_attestation: {
      classical_audit_present: true,
      pq_ready: pq.pq_mode !== "off",
      pq_enforced: pq.pq_mode === "hybrid-enforced"
    }
  };
}
