export type MerchantRoutingProfile = {
  merchantId: string;
  defaultProcessor: 'cybersource' | 'bank_rail';
  bankRailEnabled: boolean;
  pqEnabled: boolean;
  pqStrictMode: boolean;
};

export async function resolveMerchantRoutingProfile(merchantId: string): Promise<MerchantRoutingProfile> {
  const strictMerchantIds = new Set(
    (process.env.PQ_STRICT_MERCHANT_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return {
    merchantId,
    defaultProcessor: 'cybersource',
    bankRailEnabled: process.env.BANK_RAIL_ENABLED === 'true',
    pqEnabled: process.env.PQ_ENABLED === 'true',
    pqStrictMode: strictMerchantIds.has(merchantId)
  };
}
