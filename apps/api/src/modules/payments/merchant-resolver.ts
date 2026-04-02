import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { merchants, merchantProcessorAccounts } from "../../db/schema.js";

export async function resolveMerchant(merchantId?: string) {
  if (!merchantId) return null;

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  if (!merchant) return null;

  const [processorAccount] = await db
    .select()
    .from(merchantProcessorAccounts)
    .where(eq(merchantProcessorAccounts.merchantId, merchantId))
    .limit(1);

  return {
    ...merchant,
    processor: (processorAccount as any)?.processor || (merchant as any)?.processor || "cybersource",
    processorAccount: processorAccount || null
  };
}
