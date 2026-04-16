export type PQSidecarHealth = {
  ok: boolean;
  status: 'up' | 'down';
  url: string | null;
  error?: string;
};

export type PQProofRequest = {
  merchantId: string;
  merchantReference: string;
  paymentIntentId?: string;
  paymentAttemptId?: string;
  amount: number;
  currency: string;
  processor: string;
  requestedProcessor?: string | null;
  payloadHash: string;
  createdAt: string;
};

export async function getPQSidecarHealth(): Promise<PQSidecarHealth> {
  const url = process.env.PQ_SIDECAR_URL || null;

  if (process.env.PQ_ENABLED !== 'true') {
    return { ok: false, status: 'down', url, error: 'PQ disabled' };
  }

  if (!url) {
    return { ok: false, status: 'down', url, error: 'Missing PQ_SIDECAR_URL' };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/health`, {
      method: 'GET',
      headers: { accept: 'application/json' }
    });

    if (!res.ok) {
      return { ok: false, status: 'down', url, error: `HTTP ${res.status}` };
    }

    return { ok: true, status: 'up', url };
  } catch (err: any) {
    return { ok: false, status: 'down', url, error: err?.message || 'unknown error' };
  }
}

export async function submitPQProofRequest(_req: PQProofRequest): Promise<{ queued: boolean; mode: string; status: 'submitted' | 'disabled' }> {
  if (process.env.PQ_ENABLED !== 'true') {
    return { queued: false, mode: 'disabled', status: 'disabled' };
  }

  return {
    queued: true,
    mode: process.env.PQ_AUDIT_ONLY === 'false' ? 'strict' : 'async-audit',
    status: 'submitted'
  };
}
