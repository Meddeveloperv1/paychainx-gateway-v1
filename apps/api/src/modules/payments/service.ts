import { resolveMerchant } from "./merchant-resolver.js";
import { resolveProcessor } from "./processor-router.js";
import { normalizeResponse } from "./response-normalizer.js";
import { wrapExecution } from "../security/quantum-wrapper.js";

/**
 * SALE
 */
export async function createSale(auth: any, input: any) {
  const merchant = await resolveMerchant(input.merchant_id, {
    preferredProcessor: input.routing?.preferred_processor,
    environment: input.routing?.environment
  });
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  const result = await processor.sale({
    ...input,
    auth
  });

  const audit = wrapExecution({
    ...input,
    auth
  }, result);

  return { ...normalizeResponse(input, result, result.processor || "unknown"), audit };
}

/**
 * CAPTURE
 */
export async function capturePayment(auth: any, input: any) {
  const merchant = await resolveMerchant(input.merchant_id, {
    preferredProcessor: input.routing?.preferred_processor,
    environment: input.routing?.environment
  });
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  const result = await processor.capture({
    ...input,
    auth
  });

  const audit = wrapExecution({
    ...input,
    auth
  }, result);

  return { ...normalizeResponse(input, result, result.processor || "unknown"), audit };
}

/**
 * VOID
 */
export async function voidPayment(auth: any, input: any) {
  const merchant = await resolveMerchant(input.merchant_id, {
    preferredProcessor: input.routing?.preferred_processor,
    environment: input.routing?.environment
  });
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  const result = await processor.void({
    ...input,
    auth
  });

  const audit = wrapExecution({
    ...input,
    auth
  }, result);

  return { ...normalizeResponse(input, result, result.processor || "unknown"), audit };
}

/**
 * REFUND
 */
export async function refundPayment(auth: any, input: any) {
  const merchant = await resolveMerchant(input.merchant_id, {
    preferredProcessor: input.routing?.preferred_processor,
    environment: input.routing?.environment
  });
  const processor = resolveProcessor(
  input.routing?.preferred_processor ||
  input.payment_source?.type ||
  "cybersource",
  merchant
);

  const result = await processor.refund({
    ...input,
    auth
  });

  const audit = wrapExecution({
    ...input,
    auth
  }, result);

  return { ...normalizeResponse(input, result, result.processor || "unknown"), audit };
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
