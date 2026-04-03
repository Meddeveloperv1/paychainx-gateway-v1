import crypto from "crypto";
import { getPqMetadata } from "./config.js";
import { getPqKeyMaterial } from "./keys.js";

export function verifyPqEnvelope(payload: any, pq_hash: string, pq_signature: string) {
  const pq = getPqMetadata();
  const { pq_private_seed } = getPqKeyMaterial();

  const canonical = JSON.stringify({
    pq,
    payload
  });

  const expectedHash = crypto
    .createHash("sha512")
    .update(canonical)
    .digest("hex");

  const expectedSignature = crypto
    .createHmac("sha512", pq_private_seed)
    .update(expectedHash)
    .digest("hex");

  return {
    pq_hash_valid: expectedHash === pq_hash,
    pq_signature_valid: expectedSignature === pq_signature,
    pq_valid: expectedHash === pq_hash && expectedSignature === pq_signature
  };
}
