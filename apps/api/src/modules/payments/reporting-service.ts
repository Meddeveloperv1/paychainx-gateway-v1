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

  const data = [];

  for (const intent of intents) {
    const attempts = await db.select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentIntentId, intent.id))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(1);

    const latest = attempts[0];

    data.push({
      id: intent.id,
      merchant_reference: intent.merchantReference,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      processor: intent.processor,
      payment_method_type: intent.paymentMethodType,
      customer_ref: intent.customerRef,
      customer_email: intent.customerEmail,
      description: intent.description,
      latest_attempt_id: latest?.id ?? null,
      latest_attempt_action: latest?.action ?? null,
      latest_attempt_status: latest?.status ?? null,
      processor_transaction_id: latest?.processorTransactionId ?? null,
      processor_status: latest?.processorStatus ?? null,
      processor_http_status: latest?.processorHttpStatus ?? null,
      last_error: latest?.errorMessage ?? null,
      created_at: intent.createdAt,
      updated_at: intent.updatedAt
    });
  }

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

export async function getTransactionAttempts(merchantId: string, paymentId: string) {
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

export async function getDailyBreakdown(merchantId: string) {
  const intents = await db.select()
    .from(paymentIntents)
    .where(eq(paymentIntents.merchantId, merchantId));

  const buckets: Record<string, {
    date: string;
    processor: string;
    total_amount: number;
    succeeded_amount: number;
    failed_amount: number;
    authorized_amount: number;
    captured_count: number;
    failed_count: number;
    authorized_count: number;
    total_transactions: number;
  }> = {};

  for (const row of intents) {
    const date = new Date(row.createdAt).toISOString().slice(0, 10);
    const key = `${date}__${row.processor}`;

    if (!buckets[key]) {
      buckets[key] = {
        date,
        processor: row.processor,
        total_amount: 0,
        succeeded_amount: 0,
        failed_amount: 0,
        authorized_amount: 0,
        captured_count: 0,
        failed_count: 0,
        authorized_count: 0,
        total_transactions: 0
      };
    }

    const bucket = buckets[key];
    bucket.total_amount += row.amount;
    bucket.total_transactions += 1;

    if (row.status === 'captured') {
      bucket.succeeded_amount += row.amount;
      bucket.captured_count += 1;
    } else if (row.status === 'authorized') {
      bucket.authorized_amount += row.amount;
      bucket.authorized_count += 1;
    } else if (row.status === 'failed') {
      bucket.failed_amount += row.amount;
      bucket.failed_count += 1;
    }
  }

  return Object.values(buckets).sort((a, b) =>
    `${b.date}-${b.processor}`.localeCompare(`${a.date}-${a.processor}`)
  );
}

export function transactionsToCsv(rows: Array<Record<string, unknown>>) {
  const headers = [
    'id',
    'merchant_reference',
    'amount',
    'currency',
    'status',
    'processor',
    'payment_method_type',
    'customer_ref',
    'customer_email',
    'description',
    'latest_attempt_id',
    'latest_attempt_action',
    'latest_attempt_status',
    'processor_transaction_id',
    'processor_status',
    'processor_http_status',
    'last_error',
    'created_at',
    'updated_at'
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
