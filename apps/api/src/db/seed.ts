import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { merchants, apiKeys, merchantProcessorAccounts } from './schema.js';
import { generateApiKey, hashApiKey } from '../lib/api-key.js';

async function main() {
  const merchantName = 'PaychainX Test Merchant';
  const existing = await db.select().from(merchants).where(eq(merchants.name, merchantName)).limit(1);

  let merchantId: string;

  if (existing[0]) {
    merchantId = existing[0].id;
  } else {
    const inserted = await db.insert(merchants).values({
      name: merchantName,
      status: 'active'
    }).returning({ id: merchants.id });

    merchantId = inserted[0].id;
  }

  const rawApiKey = generateApiKey();
  const keyHash = hashApiKey(rawApiKey);

  await db.insert(apiKeys).values({
    merchantId,
    keyHash,
    label: 'default-test-key',
    status: 'active'
  });

  const existingProcessor = await db.select()
    .from(merchantProcessorAccounts)
    .where(eq(merchantProcessorAccounts.merchantId, merchantId))
    .limit(1);

  if (!existingProcessor[0]) {
    await db.insert(merchantProcessorAccounts).values({
      merchantId,
      processor: 'cybersource',
      accountName: 'default-cybersource-sandbox',
      transactingMid: 'paychainxtest001',
      merchantIdOnProcessor: 'paychainxtest001',
      keyId: 'replace_me',
      keySecretEncrypted: 'replace_me',
      environment: 'sandbox',
      isDefault: true
    });
  }

  console.log('');
  console.log('SEED COMPLETE');
  console.log(`merchant_id=${merchantId}`);
  console.log(`api_key=${rawApiKey}`);
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
