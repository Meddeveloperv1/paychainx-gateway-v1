import { db } from '../../db/client.js';
import { paymentIntents, paymentAttempts } from '../../db/schema.js';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';

type TransactionQuery = {
  status?: string;
  processor?: string;
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
};

function buildConditions(merchantId: string, query: TransactionQuery) {
  const conditions: any[] = [eq(paymentIntents.merchantId, merchantId)];

  if (query.status) conditions.push(eq(paymentIntents.status, query.status));
  if (query.processor) conditions.push(eq(paymentIntents.processor, query.processor));
  if (query.date_from) conditions.push(gte(paymentIntents.createdAt, new Date(query.date_from)));
  if (query.date_to) conditions.push(lte(paymentIntents.createdAt, new Date(query.date_to)));

  return conditions;
}

export async function listTransactions(merchantId: string, query: TransactionQuery) {
  const limit = Math.min(query.limit ?? 50, 1000);
  const offset = query.offset ?? 0;

  const conditions = buildConditions(merchantId, query);

  const totalRows = await db
    .select({ total: count() })
    .from(paymentIntents)
    .where(and(...conditions));

  const total_count = Number(totalRows[0]?.total ?? 0);

  const intents = await db.select()
    .from(paymentIntents)
    .where(and(...conditions))
    .orderBy(desc(paymentIntents.createdAt))
    .limit(limit)
    .offset(offset);

  const results = [];

  for (const intent of intents) {
    const attempts = await db.select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentIntentId, intent.id))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(1);

    const attempt = attempts[0];

    results.push({
      id: intent.id,
      merchant_reference: intent.merchantReference,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      processor: intent.processor,
      processor_transaction_id: attempt?.processorTransactionId ?? null,
      processor_status: attempt?.processorStatus ?? null,
      processor_http_status: attempt?.processorHttpStatus ?? null,
      attempt_status: attempt?.status ?? null,
      last_error: attempt?.errorMessage ?? null,
      created_at: intent.createdAt
    });
  }

  const next_offset = offset + results.length;
  const has_more = next_offset < total_count;

  return {
    data: results,
    pagination: {
      total_count,
      limit,
      offset,
      has_more,
      next_offset: has_more ? next_offset : null
    }
  };
}

export function transactionsToCsv(rows: any[]) {
  const headers = [
    'id',
    'merchant_reference',
    'amount',
    'currency',
    'status',
    'processor',
    'processor_transaction_id',
    'processor_status',
    'processor_http_status',
    'attempt_status',
    'last_error',
    'created_at'
  ];

  const escape = (v: any) => {
    if (!v) return '';
    const s = String(v);
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');
}


export async function getTransactionSummary(
  merchantId: string,
  query?: {
    status?: string;
    processor?: string;
    date_from?: string;
    date_to?: string;
  }
) {
  const conditions = buildConditions(merchantId, query ?? {});

  const rows = await db.select()
    .from(paymentIntents)
    .where(and(...conditions));

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


export async function getTransactionAttempts(
  merchantId: string,
  paymentId: string
) {
  const rows = await db.select()
    .from(paymentAttempts)
    .where(and(
      eq(paymentAttempts.merchantId, merchantId),
      eq(paymentAttempts.paymentIntentId, paymentId)
    ))
    .orderBy(desc(paymentAttempts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    payment_intent_id: row.paymentIntentId,
    action: row.action,
    processor: row.processor,
    status: row.status,
    processor_transaction_id: row.processorTransactionId,
    processor_status: row.processorStatus,
    processor_http_status: row.processorHttpStatus,
    error_message: row.errorMessage,
    created_at: row.createdAt,
    updated_at: row.updatedAt
  }));
}
