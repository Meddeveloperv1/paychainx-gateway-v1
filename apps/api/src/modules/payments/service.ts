import { resolveMerchant } from "./merchant-resolver.js";
import { resolveProcessor } from "./processor-router.js";

/**
 * SALE
 */
export async function createSale(auth: any, input: any) {
  const merchant = resolveMerchant(input.merchant_id);
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  return processor.sale({
    ...input,
    auth
  });
}

/**
 * CAPTURE
 */
export async function capturePayment(auth: any, input: any) {
  const merchant = resolveMerchant(input.merchant_id);
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  return processor.capture({
    ...input,
    auth
  });
}

/**
 * VOID
 */
export async function voidPayment(auth: any, input: any) {
  const merchant = resolveMerchant(input.merchant_id);
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  return processor.void({
    ...input,
    auth
  });
}

/**
 * REFUND
 */
export async function refundPayment(auth: any, input: any) {
  const merchant = resolveMerchant(input.merchant_id);
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  return processor.refund({
    ...input,
    auth
  });
}

/**
 * RESTORE MISSING EXPORTS (REQUIRED BY ROUTES)
 */
export async function getPaymentById(id: string) {
  return {
    id,
    status: "stub"
  };
}

export async function getPaymentAttempts(id: string) {
  return [];
}
