import { db } from '../../db/client.js';
import { merchantCapabilities } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export type MerchantCapabilityProfile = {
  merchantId: string;
  allowedCurrencies: string[];
  allowedChannels: string[];
  defaultProcessor: 'cybersource' | 'bank_rail';
  cybersourceEnabled: boolean;
  bankRailEnabled: boolean;
  pqEnabled: boolean;
  pqStrictMode: boolean;
};

function parseList(value: string | null | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export async function getMerchantCapabilities(merchantId: string): Promise<MerchantCapabilityProfile> {
  const rows = await db.select()
    .from(merchantCapabilities)
    .where(eq(merchantCapabilities.merchantId, merchantId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    const strictMerchantIds = new Set(
      (process.env.PQ_STRICT_MERCHANT_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    return {
      merchantId,
      allowedCurrencies: parseList(process.env.DEFAULT_ALLOWED_CURRENCIES, ['USD']),
      allowedChannels: parseList(process.env.DEFAULT_ALLOWED_CHANNELS, ['ECOM']),
      defaultProcessor: 'cybersource',
      cybersourceEnabled: true,
      bankRailEnabled: process.env.DEFAULT_BANK_RAIL_ENABLED === 'true',
      pqEnabled: process.env.PQ_ENABLED === 'true',
      pqStrictMode: strictMerchantIds.has(merchantId)
    };
  }

  return {
    merchantId,
    allowedCurrencies: parseList(row.allowedCurrencies, ['USD']),
    allowedChannels: parseList(row.allowedChannels, ['ECOM']),
    defaultProcessor: (row.defaultProcessor === 'bank_rail' ? 'bank_rail' : 'cybersource'),
    cybersourceEnabled: row.cybersourceEnabled,
    bankRailEnabled: row.bankRailEnabled,
    pqEnabled: row.pqEnabled,
    pqStrictMode: row.pqStrictMode
  };
}

export async function upsertMerchantCapabilities(input: {
  merchantId: string;
  allowedCurrencies: string[];
  allowedChannels: string[];
  defaultProcessor: 'cybersource' | 'bank_rail';
  cybersourceEnabled: boolean;
  bankRailEnabled: boolean;
  pqEnabled: boolean;
  pqStrictMode: boolean;
}) {
  const existing = await db.select()
    .from(merchantCapabilities)
    .where(eq(merchantCapabilities.merchantId, input.merchantId))
    .limit(1);

  const payload = {
    merchantId: input.merchantId,
    allowedCurrencies: input.allowedCurrencies.map(v => v.toUpperCase()).join(','),
    allowedChannels: input.allowedChannels.map(v => v.toUpperCase()).join(','),
    defaultProcessor: input.defaultProcessor,
    cybersourceEnabled: input.cybersourceEnabled,
    bankRailEnabled: input.bankRailEnabled,
    pqEnabled: input.pqEnabled,
    pqStrictMode: input.pqStrictMode,
    updatedAt: new Date()
  };

  if (existing[0]) {
    await db.update(merchantCapabilities)
      .set(payload)
      .where(eq(merchantCapabilities.merchantId, input.merchantId));
  } else {
    await db.insert(merchantCapabilities).values({
      ...payload,
      createdAt: new Date()
    });
  }

  return getMerchantCapabilities(input.merchantId);
}
