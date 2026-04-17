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

  if (query.status) {
    conditions.push(eq(paymentIntents.status, query.status));
  }

  if (query.processor) {
    conditions.push(eq(paymentIntents.processor, query.processor));
  }

  if (query.date_from) {
    conditions.push(gte(paymentIntents.createdAt, new Date(query.date_from)));
  }

  if (query.date_to) {
    conditions.push(lte(paymentIntents.createdAt, new Date(query.date_to)));
  }

  return conditions;
}

export async function listTransactions(
  merchantId: string,
  query: TransactionQuery
) {
  const limit = Math.min(query.limit ?? 50, 1000);
  const offset = query.offset ?? 0;

  const conditions = buildConditions(merchantId, query);

  const totalRows = await db
    .select({ total: count() })
    .from(paymentIntents)
    .where(and(...conditions));

  const total_count = Number(totalRows[0]?.total ?? 0);

  const rows = await db.select()
    .from(paymentIntents)
    .where(and(...conditions))
    .orderBy(desc(paymentIntents.createdAt))
    .limit(limit)
    .offset(offset);

  const data = rows.map((row) => ({
    id: row.id,
    merchant_reference: row.merchantReference,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    processor: row.processor,
    customer_ref: row.customerRef,
    customer_email: row.customerEmail,
    description: row.description,
    created_at: row.createdAt
  }));

  const next_offset = offset + data.length;
  const has_more = next_offset < total_count;

  return {
    data,
    pagination: {
      total_count,
      limit,
      offset,
      has_more,
      next_offset: has_more ? next_offset : null
    }
  };
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

export function transactionsToCsv(rows: Array<Record<string, unknown>>) {
  const headers = [
    'id',
    'merchant_reference',
    'amount',
    'currency',
    'status',
    'processor',
    'customer_ref',
    'customer_email',
    'description',
    'created_at'
  ];

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(','))
  ];

  return lines.join('\n');
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
