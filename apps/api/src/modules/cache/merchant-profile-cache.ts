type MerchantRoutingProfile = {
  merchantId: string;
  defaultProcessor: 'cybersource' | 'bank_rail';
  bankRailEnabled: boolean;
  pqEnabled: boolean;
};

type CacheEntry = {
  value: MerchantRoutingProfile;
  expiresAt: number;
};

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function getCachedMerchantRoutingProfile(merchantId: string): MerchantRoutingProfile | null {
  const hit = cache.get(merchantId);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(merchantId);
    return null;
  }
  return hit.value;
}

export function setCachedMerchantRoutingProfile(value: MerchantRoutingProfile): void {
  cache.set(value.merchantId, {
    value,
    expiresAt: Date.now() + TTL_MS
  });
}

export function clearMerchantRoutingProfileCache(): void {
  cache.clear();
}
