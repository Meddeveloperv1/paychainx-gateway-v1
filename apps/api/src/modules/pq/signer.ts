import crypto from "crypto";
import { getPqKeyMaterial, derivePqKeyFingerprint } from "./keys.js";
import { getPqMetadata } from "./config.js";

export function signPqEnvelope(payload: any) {
  const pq = getPqMetadata();
  const keys = getPqKeyMaterial();

  const canonical = JSON.stringify({
    pq,
    payload
  });

  const pq_hash = crypto.createHash("sha512").update(canonical).digest("hex");

  const pq_signature = crypto
    .createHmac("sha512", keys.pq_private_seed)
    .update(pq_hash)
    .digest("hex");

  return {
    pq,
    pq_hash,
    pq_signature,
    pq_key_fingerprint: derivePqKeyFingerprint()
  };
}
