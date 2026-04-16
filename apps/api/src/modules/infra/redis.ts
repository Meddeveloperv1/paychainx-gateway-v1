let client: any = null;
let connecting: Promise<any | null> | null = null;

export async function getRedis(): Promise<any | null> {
  if (process.env.REDIS_IDEMPOTENCY_ENABLED !== 'true') return null;

  if (client && client.status === 'ready') {
    return client;
  }

  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    const mod: any = await import('ioredis');
    const RedisCtor: any = mod.default ?? mod;

    client = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });

    client.on('error', (_err: unknown) => {});
  }

  if (client.status === 'ready') {
    return client;
  }

  if (!connecting) {
    connecting = client.connect()
      .then(() => client)
      .catch(() => null)
      .finally(() => {
        connecting = null;
      });
  }

  return connecting;
}
