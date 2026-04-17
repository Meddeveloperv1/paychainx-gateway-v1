import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export async function listTransactions(
  merchantId: string,
  query: {
    status?: string;
    processor?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.min(query.limit ?? 50, 100);
  const offset = query.offset ?? 0;

  const conditions = [eq(paymentIntents.merchantId, merchantId)];

  if (query.status) {
    conditions.push(eq(paymentIntents.status, query.status));
  }

  if (query.processor) {
    conditions.push(eq(paymentIntents.processor, query.processor));
  }

  const rows = await db.select()
    .from(paymentIntents)
    .where(and(...conditions))
    .orderBy(desc(paymentIntents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    merchant_reference: row.merchantReference,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    processor: row.processor,
    created_at: row.createdAt
  }));
}

export async function getTransactionSummary(merchantId: string) {
  const rows = await db.select().from(paymentIntents)
    .where(eq(paymentIntents.merchantId, merchantId));

  let total = 0;
  let succeeded = 0;
  let failed = 0;

  for (const r of rows) {
    total += r.amount;
    if (r.status === 'captured' || r.status === 'authorized') succeeded += r.amount;
    if (r.status === 'failed') failed += r.amount;
  }

  return {
    total_amount: total,
    succeeded_amount: succeeded,
    failed_amount: failed,
    total_transactions: rows.length
  };
}
