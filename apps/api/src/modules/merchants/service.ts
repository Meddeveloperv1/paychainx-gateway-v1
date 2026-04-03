import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { merchantProcessorAccounts } from "../../db/schema.js";

function maskValue(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function normalizeCredentialMetadata(account: any) {
  const cfg =
    account?.credentials ||
    account?.config ||
    account?.settings ||
    account?.credentialJson ||
    {};

  return {
    has_credentials: Object.keys(cfg).length > 0,
    merchant_id: maskValue(cfg.merchantId || cfg.merchant_id || null),
    terminal_id: maskValue(cfg.terminalId || cfg.terminal_id || null),
    api_key: maskValue(cfg.apiKey || cfg.api_key || null),
    base_url: cfg.baseUrl || cfg.base_url || null,
    environment: cfg.environment || account?.environment || account?.env || null
  };
}

export async function getMerchantProcessors(merchantId: string) {
  const accounts = await db
    .select()
    .from(merchantProcessorAccounts)
    .where(eq(merchantProcessorAccounts.merchantId, merchantId));

  return accounts.map((account: any) => ({
    id: account.id,
    merchant_id: account.merchantId,
    processor: account.processor,
    environment: account.environment || account.env || null,
    status: account.status || null,
    active: account.isActive === true || account.status === "active",
    is_default: account.isDefault === true || account.default === true,
    credential_metadata: normalizeCredentialMetadata(account),
    created_at: account.createdAt || null,
    updated_at: account.updatedAt || null
  }));
}
