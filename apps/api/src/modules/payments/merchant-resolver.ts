export function resolveMerchant(merchantId?: string) {
  if (!merchantId) return null;

  if (merchantId === "propelr_demo") {
    return { id: merchantId, processor: "propelr" };
  }

  if (merchantId === "freedom_demo") {
    return { id: merchantId, processor: "freedompay" };
  }

  return { id: merchantId, processor: "cybersource" };
}
