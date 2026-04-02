/**
 * TEMP credential resolver (replace with DB later)
 */

export function resolveCredentials(merchant?: any) {
  if (!merchant) return null;

  // 🔥 TEMP: simulate per-merchant credentials
  return {
    merchantId: process.env.CYBERSOURCE_MERCHANT_ID,
    keyId: process.env.CYBERSOURCE_KEY_ID,
    secret: process.env.CYBERSOURCE_SECRET
  };
}
