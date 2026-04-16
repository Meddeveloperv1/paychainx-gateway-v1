type AuditEvent = {
  type: string;
  payload: unknown;
  createdAt: string;
};

type PQProofStatus = {
  merchantReference: string;
  payloadHash: string;
  status: 'queued' | 'submitted' | 'disabled' | 'failed';
  mode: string;
  proofId?: string;
  error?: string;
  updatedAt: string;
};

const queue: AuditEvent[] = [];
const proofStatus = new Map<string, PQProofStatus>();

export function enqueueAuditEvent(type: string, payload: unknown): void {
  if (process.env.AUDIT_QUEUE_ENABLED !== 'true') return;
  queue.push({
    type,
    payload,
    createdAt: new Date().toISOString()
  });
}

export function drainAuditEvents(): AuditEvent[] {
  return queue.splice(0, queue.length);
}

export function getAuditQueueDepth(): number {
  return queue.length;
}

export function setPQProofStatus(key: string, value: PQProofStatus): void {
  proofStatus.set(key, value);
}

export function getPQProofStatus(key: string): PQProofStatus | null {
  return proofStatus.get(key) ?? null;
}
