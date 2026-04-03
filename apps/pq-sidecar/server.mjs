import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PQ_SIDECAR_PORT || 8091);
const PROVIDER = process.env.PQ_SIDECAR_PROVIDER || "dev-deterministic";
const KEY_ID = process.env.PQ_KEY_ID || "pq-dev-key-1";
const PRIVATE_SEED = process.env.PQ_PRIVATE_SEED || "pq-dev-private-seed";
const PUBLIC_SEED = process.env.PQ_PUBLIC_SEED || "pq-dev-public-seed";
const PQ_KEM = process.env.PQ_KEM_ALG || "ml-kem-placeholder";
const PQ_SIG = process.env.PQ_SIG_ALG || "ml-dsa-placeholder";

function json(res, code, payload) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function pqKeyFingerprint() {
  return crypto
    .createHash("sha256")
    .update(`${KEY_ID}:${PUBLIC_SEED}`)
    .digest("hex");
}

function signDeterministic(payload) {
  const canonical = JSON.stringify(payload);
  const pq_hash = crypto.createHash("sha512").update(canonical).digest("hex");
  const pq_signature = crypto
    .createHmac("sha512", PRIVATE_SEED)
    .update(pq_hash)
    .digest("hex");

  return {
    provider: PROVIDER,
    pq_algorithm: PQ_SIG,
    pq_kem: PQ_KEM,
    pq_key_id: KEY_ID,
    pq_key_fingerprint: pqKeyFingerprint(),
    pq_hash,
    pq_signature
  };
}

function verifyDeterministic(payload, pq_hash, pq_signature) {
  const expectedHash = crypto
    .createHash("sha512")
    .update(JSON.stringify(payload))
    .digest("hex");

  const expectedSignature = crypto
    .createHmac("sha512", PRIVATE_SEED)
    .update(expectedHash)
    .digest("hex");

  return {
    provider: PROVIDER,
    pq_hash_valid: expectedHash === pq_hash,
    pq_signature_valid: expectedSignature === pq_signature,
    pq_valid: expectedHash === pq_hash && expectedSignature === pq_signature
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, {
        ok: true,
        provider: PROVIDER,
        pq_algorithm: PQ_SIG,
        pq_kem: PQ_KEM,
        pq_key_id: KEY_ID
      });
    }

    if (req.method === "POST" && req.url === "/sign") {
      const body = await readBody(req);
      const payload = body?.payload ?? {};
      return json(res, 200, signDeterministic(payload));
    }

    if (req.method === "POST" && req.url === "/verify") {
      const body = await readBody(req);
      const payload = body?.payload ?? {};
      const pq_hash = body?.pq_hash ?? "";
      const pq_signature = body?.pq_signature ?? "";
      return json(res, 200, verifyDeterministic(payload, pq_hash, pq_signature));
    }

    return json(res, 404, { error: "not_found" });
  } catch (err) {
    return json(res, 500, {
      error: "sidecar_error",
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`PQ sidecar listening on 127.0.0.1:${PORT} provider=${PROVIDER}`);
});
