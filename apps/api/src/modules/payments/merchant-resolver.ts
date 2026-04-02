export function resolveMerchant(merchantId?: string) {
  if (!merchantId) return null;

  return {
    id: merchantId,
    processor: "cybersource"
  };
}
