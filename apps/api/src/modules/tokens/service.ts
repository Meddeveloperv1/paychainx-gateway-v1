import crypto from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { paymentTokens } from '../../db/schema.js';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function makeTokenId() {
  return `ptok_${crypto.randomBytes(18).toString('hex')}`;
}

export async function createStoredToken(auth: { merchantId: string }, input: {
  customer_ref?: string;
  processor?: string;
  processor_token_ref: string;
  fingerprint_source: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  billing_name?: string;
  billing_zip?: string;
  metadata?: Record<string, unknown>;
}) {
  const inserted = await db.insert(paymentTokens).values({
    tokenId: makeTokenId(),
    customerRef: input.customer_ref ?? null,
    merchantId: auth.merchantId,
    processor: input.processor ?? 'cybersource',
    processorTokenRef: input.processor_token_ref,
    fingerprintSha256: sha256(input.fingerprint_source),
    brand: input.brand ?? null,
    last4: input.last4 ?? null,
    expMonth: input.exp_month ?? null,
    expYear: input.exp_year ?? null,
    billingName: input.billing_name ?? null,
    billingZip: input.billing_zip ?? null,
    status: 'active',
    metadata: input.metadata ?? {}
  }).returning();

  const row = inserted[0];

  return {
    token_id: row.tokenId,
    customer_ref: row.customerRef,
    merchant_id: row.merchantId,
    processor: row.processor,
    brand: row.brand,
    last4: row.last4,
    exp_month: row.expMonth,
    exp_year: row.expYear,
    status: row.status,
    created_at: row.createdAt
  };
}

export async function getStoredToken(auth: { merchantId: string }, tokenId: string) {
  const rows = await db.select().from(paymentTokens)
    .where(and(
      eq(paymentTokens.tokenId, tokenId),
      eq(paymentTokens.merchantId, auth.merchantId)
    ))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    token_id: row.tokenId,
    customer_ref: row.customerRef,
    merchant_id: row.merchantId,
    processor: row.processor,
    processor_token_ref: row.processorTokenRef,
    brand: row.brand,
    last4: row.last4,
    exp_month: row.expMonth,
    exp_year: row.expYear,
    billing_name: row.billingName,
    billing_zip: row.billingZip,
    status: row.status,
    metadata: row.metadata,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    revoked_at: row.revokedAt
  };
}

export async function listStoredTokens(auth: { merchantId: string }) {
  const rows = await db.select().from(paymentTokens)
    .where(eq(paymentTokens.merchantId, auth.merchantId))
    .orderBy(desc(paymentTokens.createdAt))
    .limit(100);

  return rows.map((row) => ({
    token_id: row.tokenId,
    customer_ref: row.customerRef,
    merchant_id: row.merchantId,
    processor: row.processor,
    brand: row.brand,
    last4: row.last4,
    exp_month: row.expMonth,
    exp_year: row.expYear,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }));
}

export async function revokeStoredToken(auth: { merchantId: string }, tokenId: string) {
  const updated = await db.update(paymentTokens)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(
      eq(paymentTokens.tokenId, tokenId),
      eq(paymentTokens.merchantId, auth.merchantId)
    ))
    .returning();

  const row = updated[0];
  if (!row) return null;

  return {
    token_id: row.tokenId,
    status: row.status,
    revoked_at: row.revokedAt,
    updated_at: row.updatedAt
  };
}

export async function resolveStoredTokenToPaymentMethod(
  auth: { merchantId: string },
  tokenId: string
) {
  const rows = await db.select().from(paymentTokens)
    .where(and(
      eq(paymentTokens.tokenId, tokenId),
      eq(paymentTokens.merchantId, auth.merchantId)
    ))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new Error('TOKEN_NOT_FOUND');
  }

  if (row.status !== 'active') {
    throw new Error('TOKEN_NOT_ACTIVE');
  }

  return {
    type: 'card_token' as const,
    token_ref: row.processorTokenRef
  };
}
