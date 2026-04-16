import { getRedis } from '../infra/redis.js';

const RESPONSE_TTL_SEC = 300;
const INFLIGHT_TTL_SEC = 30;

function inflightKey(key: string) {
  return `paychainx:idem:inflight:${key}`;
}

function responseKey(key: string) {
  return `paychainx:idem:response:${key}`;
}

export async function redisSetInFlight(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const res = await redis.set(inflightKey(key), '1', 'EX', INFLIGHT_TTL_SEC, 'NX');
  return res === 'OK';
}

export async function redisClearInFlight(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(inflightKey(key));
}

export async function redisHasInFlight(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const res = await redis.exists(inflightKey(key));
  return res === 1;
}

export async function redisSetResponse(key: string, statusCode: number, body: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(
    responseKey(key),
    JSON.stringify({ statusCode, body }),
    'EX',
    RESPONSE_TTL_SEC
  );
}

export async function redisGetResponse(key: string): Promise<{ statusCode: number; body: unknown } | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(responseKey(key));
  if (!raw) return null;
  return JSON.parse(raw);
}
