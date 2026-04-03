const PQ_SIDECAR_URL = process.env.PQ_SIDECAR_URL || "";

async function post(path: string, body: any) {
  const base = PQ_SIDECAR_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`PQ sidecar error ${res.status}`);
  }

  return res.json();
}

export async function pqSidecarHealth() {
  if (!PQ_SIDECAR_URL) return { available: false, reason: "no-sidecar-url" };

  try {
    const res = await fetch(`${PQ_SIDECAR_URL.replace(/\/+$/, "")}/health`);
    if (!res.ok) return { available: false, reason: `status-${res.status}` };
    const data = await res.json();
    return { available: true, ...data };
  } catch (err) {
    return {
      available: false,
      reason: err instanceof Error ? err.message : String(err)
    };
  }
}

export async function pqSidecarSign(payload: any) {
  return post("/sign", { payload });
}

export async function pqSidecarVerify(payload: any, pq_hash: string, pq_signature: string) {
  return post("/verify", { payload, pq_hash, pq_signature });
}
