export function getPQKeyInfo() {
  return {
    enabled: process.env.PQ_ENABLED === 'true',
    keyId: process.env.PQ_KEY_ID || 'pq-disabled'
  };
}
