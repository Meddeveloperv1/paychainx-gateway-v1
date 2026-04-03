import crypto from "crypto";

export function getPqKeyMaterial() {
  return {
    pq_key_id: process.env.PQ_KEY_ID || "pq-dev-key-1",
    pq_private_seed: process.env.PQ_PRIVATE_SEED || "pq-dev-private-seed",
    pq_public_seed: process.env.PQ_PUBLIC_SEED || "pq-dev-public-seed"
  };
}

export function derivePqKeyFingerprint() {
  const { pq_key_id, pq_public_seed } = getPqKeyMaterial();
  return crypto
    .createHash("sha256")
    .update(`${pq_key_id}:${pq_public_seed}`)
    .digest("hex");
}
