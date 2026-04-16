export function verifyPQPayload(_payload: unknown) {
  return {
    ok: true,
    mode: process.env.PQ_ENABLED === 'true' ? 'enabled' : 'disabled'
  };
}
