export function isPQEnabled(): boolean {
  return process.env.PQ_ENABLED === 'true';
}

export function isPQAuditOnly(): boolean {
  return process.env.PQ_AUDIT_ONLY !== 'false';
}

export function getPQSidecarUrl(): string | null {
  return process.env.PQ_SIDECAR_URL || null;
}
