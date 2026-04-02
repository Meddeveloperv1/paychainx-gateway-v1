export function resolveMerchant(merchantId?: string) {
  if (!merchantId) return null;

  // 🔥 simulate different merchants
  if (merchantId === "propelr_demo") {
    return {
      id: merchantId,
      processor: "propelr"
    };
  }

  return {
    id: merchantId,
    processor: "cybersource"
  };
}
