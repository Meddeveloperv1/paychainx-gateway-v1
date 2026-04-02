import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { merchants, merchantProcessorAccounts } from "../../db/schema.js";

function pickProcessorAccount(
  accounts: any[],
  requestedProcessor?: string,
  requestedEnvironment?: string
) {
  let filtered = accounts;

  if (requestedProcessor) {
    filtered = filtered.filter((a) => a.processor === requestedProcessor);
  }

  if (requestedEnvironment) {
    filtered = filtered.filter(
      (a) =>
        a.environment === requestedEnvironment ||
        a.env === requestedEnvironment
    );
  }

  const active = filtered.filter(
    (a) => a.status === "active" || a.isActive === true
  );

  const preferred = active.length ? active : filtered;

  return (
    preferred.find((a) => a.isDefault === true || a.default === true) ||
    preferred[0] ||
    null
  );
}

export async function resolveMerchant(
  merchantId?: string,
  opts?: {
    preferredProcessor?: string;
    environment?: string;
  }
) {
  if (!merchantId) return null;

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  if (!merchant) return null;

  const accounts = await db
    .select()
    .from(merchantProcessorAccounts)
    .where(eq(merchantProcessorAccounts.merchantId, merchantId));

  const processorAccount = pickProcessorAccount(
    accounts as any[],
    opts?.preferredProcessor,
    opts?.environment
  );

  return {
    ...merchant,
    processor:
      processorAccount?.processor ||
      (merchant as any)?.processor ||
      "cybersource",
    processorAccount,
    processorAccounts: accounts
  };
}
