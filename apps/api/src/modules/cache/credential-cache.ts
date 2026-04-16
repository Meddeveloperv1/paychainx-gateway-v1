type ProcessorCredentialSet = {
  processor: 'cybersource' | 'bank_rail';
  merchantId: string;
  credentialSource: 'env' | 'merchant_profile';
  credentialsPresent: boolean;
};

type CacheEntry = {
  value: ProcessorCredentialSet;
  expiresAt: number;
};

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function makeKey(merchantId: string, processor: string): string {
  return `${merchantId}:${processor}`;
}

export function getCachedProcessorCredentials(
  merchantId: string,
  processor: 'cybersource' | 'bank_rail'
): ProcessorCredentialSet | null {
  const key = makeKey(merchantId, processor);
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedProcessorCredentials(value: ProcessorCredentialSet): void {
  const key = makeKey(value.merchantId, value.processor);
  cache.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS
  });
}

export function clearProcessorCredentialCache(): void {
  cache.clear();
}
