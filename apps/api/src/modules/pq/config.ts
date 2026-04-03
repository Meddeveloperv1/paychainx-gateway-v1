export type PqMode = "off" | "hybrid-ready" | "hybrid-enforced";

export function getPqMode(): PqMode {
  const value = (process.env.PQ_MODE || "hybrid-ready").toLowerCase();
  if (value === "off" || value === "hybrid-ready" || value === "hybrid-enforced") {
    return value as PqMode;
  }
  return "hybrid-ready";
}

export function getPqMetadata() {
  return {
    pq_mode: getPqMode(),
    pq_kem: process.env.PQ_KEM_ALG || "ml-kem-placeholder",
    pq_sig: process.env.PQ_SIG_ALG || "ml-dsa-placeholder",
    pq_key_id: process.env.PQ_KEY_ID || "pq-dev-key-1"
  };
}
