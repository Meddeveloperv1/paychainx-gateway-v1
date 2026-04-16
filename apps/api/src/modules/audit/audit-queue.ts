type AuditEvent = {
  type: string;
  payload: unknown;
  createdAt: string;
};

const queue: AuditEvent[] = [];

export function enqueueAuditEvent(type: string, payload: unknown): void {
  if (process.env.AUDIT_QUEUE_ENABLED !== 'true') return;
  queue.push({ type, payload, createdAt: new Date().toISOString() });
}

export function drainAuditEvents(): AuditEvent[] {
  const out = queue.splice(0, queue.length);
  return out;
}
