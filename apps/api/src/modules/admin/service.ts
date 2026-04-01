import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { merchants, apiKeys } from '../../db/schema.js';
import { generateApiKey, hashApiKey } from '../../lib/api-key.js';

export async function createMerchant(input: { name: string }) {
  const inserted = await db.insert(merchants).values({
    name: input.name,
    status: 'active'
  }).returning();

  return inserted[0];
}

export async function createMerchantApiKey(merchantId: string) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const inserted = await db.insert(apiKeys).values({
    merchantId,
    keyHash,
    label: 'default',
    status: 'active'
  }).returning();

  return { rawKey, apiKey: inserted[0] };
}
