import { resolveMerchant } from "./merchant-resolver.js";
import { resolveProcessor } from "./processor-router.js";
import { normalizeResponse } from "./response-normalizer.js";
import { persistTransaction, listTransactions } from "./ledger.js";
import { buildHybridAuditEnvelope } from "../pq/hybrid-audit.js";
import { validatePqRequest } from "../pq/policy.js";
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

  const pqPolicyResult = validatePqRequest(auth?.headers || {});
  const pqAudit = await buildHybridAuditEnvelope(input, result, audit, pqPolicyResult);
  const normalized = { ...normalizeResponse(input, result, result.processor || "unknown"), audit: pqAudit };

  await persistTransaction({
    merchant_id: input.merchant_id,
    merchant_reference: normalized.merchant_reference,
    processor: normalized.processor,
    status: normalized.status,
    approved: normalized.approved,
    amount: normalized.amount,
    currency: normalized.currency,
    transaction_id: normalized.transaction_id,
    processor_reference: normalized.processor_reference,
    message: normalized.message,
    raw: normalized.raw,
    audit: normalized.audit
  });

  return normalized;
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

  const pqPolicyResult = validatePqRequest(auth?.headers || {});
  const pqAudit = await buildHybridAuditEnvelope(input, result, audit, pqPolicyResult);
  const normalized = { ...normalizeResponse(input, result, result.processor || "unknown"), audit: pqAudit };

  await persistTransaction({
    merchant_id: input.merchant_id,
    merchant_reference: normalized.merchant_reference,
    processor: normalized.processor,
    status: normalized.status,
    approved: normalized.approved,
    amount: normalized.amount,
    currency: normalized.currency,
    transaction_id: normalized.transaction_id,
    processor_reference: normalized.processor_reference,
    message: normalized.message,
    raw: normalized.raw,
    audit: normalized.audit
  });

  return normalized;
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

  const pqPolicyResult = validatePqRequest(auth?.headers || {});
  const pqAudit = await buildHybridAuditEnvelope(input, result, audit, pqPolicyResult);
  const normalized = { ...normalizeResponse(input, result, result.processor || "unknown"), audit: pqAudit };

  await persistTransaction({
    merchant_id: input.merchant_id,
    merchant_reference: normalized.merchant_reference,
    processor: normalized.processor,
    status: normalized.status,
    approved: normalized.approved,
    amount: normalized.amount,
    currency: normalized.currency,
    transaction_id: normalized.transaction_id,
    processor_reference: normalized.processor_reference,
    message: normalized.message,
    raw: normalized.raw,
    audit: normalized.audit
  });

  return normalized;
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

  const pqPolicyResult = validatePqRequest(auth?.headers || {});
  const pqAudit = await buildHybridAuditEnvelope(input, result, audit, pqPolicyResult);
  const normalized = { ...normalizeResponse(input, result, result.processor || "unknown"), audit: pqAudit };

  await persistTransaction({
    merchant_id: input.merchant_id,
    merchant_reference: normalized.merchant_reference,
    processor: normalized.processor,
    status: normalized.status,
    approved: normalized.approved,
    amount: normalized.amount,
    currency: normalized.currency,
    transaction_id: normalized.transaction_id,
    processor_reference: normalized.processor_reference,
    message: normalized.message,
    raw: normalized.raw,
    audit: normalized.audit
  });

  return normalized;
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

export async function getTransactions(auth: any, merchantId?: string) {
  return listTransactions(merchantId || auth?.merchantId);
}
