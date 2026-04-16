export function normalizeResponse(input: any, result: any, processor: string) {
  const status = result?.status || "unknown";

  const approved = ["authorized", "captured", "refunded", "voided"].includes(status);

  return {
    status,
    approved,
    processor,
    amount: result?.amount ?? input?.amount ?? null,
    currency: result?.currency ?? input?.currency ?? null,
    merchant_reference: input?.merchant_reference ?? null,
    transaction_id:
      result?.transaction_id ||
      `px_${Date.now()}`,
    processor_reference:
      result?.processor_reference ||
      result?.transaction_id ||
      null,
    message: result?.message || `${processor} processed`,
    raw: result?.raw || result
  };
}
