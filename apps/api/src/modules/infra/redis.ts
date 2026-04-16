import Redis from 'ioredis';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (process.env.REDIS_IDEMPOTENCY_ENABLED !== 'true') return null;
  if (client) return client;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  });

  client.on('error', () => { /* keep quiet on hot path */ });
  return client;
}
