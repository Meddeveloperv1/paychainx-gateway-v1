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

export type PQProofSubmitResult = {
  queued: boolean;
  mode: string;
  status: 'submitted' | 'disabled' | 'failed';
  proofId?: string;
  error?: string;
};

function sidecarBaseUrl(): string | null {
  return process.env.PQ_SIDECAR_URL || null;
}

export async function getPQSidecarHealth(): Promise<PQSidecarHealth> {
  const url = sidecarBaseUrl();

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

export async function submitPQProofRequest(req: PQProofRequest): Promise<PQProofSubmitResult> {
  if (process.env.PQ_ENABLED !== 'true') {
    return { queued: false, mode: 'disabled', status: 'disabled' };
  }

  const url = sidecarBaseUrl();
  if (!url) {
    return { queued: false, mode: 'async-audit', status: 'failed', error: 'Missing PQ_SIDECAR_URL' };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/proof`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(req)
    });

    if (!res.ok) {
      return {
        queued: false,
        mode: 'async-audit',
        status: 'failed',
        error: `HTTP ${res.status}`
      };
    }

    const data: any = await res.json().catch(() => ({}));

    return {
      queued: true,
      mode: process.env.PQ_AUDIT_ONLY === 'false' ? 'strict' : 'async-audit',
      status: 'submitted',
      proofId: data?.proof_id ?? data?.id ?? undefined
    };
  } catch (err: any) {
    return {
      queued: false,
      mode: 'async-audit',
      status: 'failed',
      error: err?.message || 'unknown error'
    };
  }
}
