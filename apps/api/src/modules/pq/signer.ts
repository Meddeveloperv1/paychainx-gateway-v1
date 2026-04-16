export function signPQPayload(payload: unknown) {
  return {
    enabled: process.env.PQ_ENABLED === 'true',
    signature: null,
    payloadHash: Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 32)
  };
}
