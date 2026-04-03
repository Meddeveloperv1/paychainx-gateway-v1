import crypto from "crypto";
import { db } from "../../db/client.js";
import { merchants, merchantProcessorAccounts, apiKeys } from "../../db/schema.js";
import { hashApiKey } from "../../lib/api-key.js";

function generateApiKey() {
  return `pkx_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createMerchant(input: {
  name: string;
  status?: string;
}) {
  const inserted = await db
    .insert(merchants)
    .values({
      name: input.name,
      status: input.status || "pending"
    })
    .returning();

  return inserted[0];
}

export async function createMerchantProcessorAccount(
  merchantId: string,
  input: {
    processor: string;
    environment?: string;
    status?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    credentials?: Record<string, any>;
  }
) {
  const inserted = await db
    .insert(merchantProcessorAccounts)
    .values({
      merchantId,
      processor: input.processor,
      environment: input.environment || "sandbox",
      status: input.status ?? null,
      isDefault: input.isDefault ?? true,
      isActive: input.isActive ?? true,
      credentials: input.credentials || {}
    } as any)
    .returning();

  return inserted[0];
}

export async function createMerchantApiKey(
  merchantId: string,
  input?: { label?: string }
) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const inserted = await db
    .insert(apiKeys)
    .values({
      merchantId,
      label: input?.label || "default",
      keyHash,
      status: "active"
    })
    .returning();

  return {
    rawKey,
    apiKey: inserted[0]
  };
}
