type InFlightEntry = {
  startedAt: number;
};

type ResponseEntry = {
  statusCode: number;
  body: unknown;
  expiresAt: number;
};

const inFlight = new Map<string, InFlightEntry>();
const responses = new Map<string, ResponseEntry>();

const INFLIGHT_TTL_MS = 30_000;
const RESPONSE_TTL_MS = 5 * 60_000;

function now() {
  return Date.now();
}

function cleanup() {
  const ts = now();

  for (const [key, value] of inFlight.entries()) {
    if (ts - value.startedAt > INFLIGHT_TTL_MS) {
      inFlight.delete(key);
    }
  }

  for (const [key, value] of responses.entries()) {
    if (ts > value.expiresAt) {
      responses.delete(key);
    }
  }
}

export function getInFlightKey(key: string): boolean {
  cleanup();
  return inFlight.has(key);
}

export function setInFlightKey(key: string): void {
  cleanup();
  inFlight.set(key, { startedAt: now() });
}

export function clearInFlightKey(key: string): void {
  inFlight.delete(key);
}

export function getCachedResponse(key: string): { statusCode: number; body: unknown } | null {
  cleanup();
  const hit = responses.get(key);
  if (!hit) return null;
  return {
    statusCode: hit.statusCode,
    body: hit.body
  };
}

export function setCachedResponse(key: string, statusCode: number, body: unknown): void {
  cleanup();
  responses.set(key, {
    statusCode,
    body,
    expiresAt: now() + RESPONSE_TTL_MS
  });
}

export function clearIdempotencyCaches(): void {
  inFlight.clear();
  responses.clear();
}
