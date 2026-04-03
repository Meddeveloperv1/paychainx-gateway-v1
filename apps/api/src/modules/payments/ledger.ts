import { db } from "../../db/client.js";
import { sql } from "drizzle-orm";

export async function persistTransaction(record: {
  merchant_id: string;
  merchant_reference?: string | null;
  processor: string;
  status: string;
  approved: boolean;
  amount?: number | null;
  currency?: string | null;
  transaction_id?: string | null;
  processor_reference?: string | null;
  message?: string | null;
  raw?: any;
  audit?: any;
}) {
  await db.execute(sql`
    create table if not exists payment_transactions (
      id uuid primary key default gen_random_uuid(),
      merchant_id text not null,
      merchant_reference text,
      processor text not null,
      status text not null,
      approved boolean not null default false,
      amount integer,
      currency text,
      transaction_id text,
      processor_reference text,
      message text,
      raw jsonb,
      audit jsonb,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    insert into payment_transactions (
      merchant_id,
      merchant_reference,
      processor,
      status,
      approved,
      amount,
      currency,
      transaction_id,
      processor_reference,
      message,
      raw,
      audit
    ) values (
      ${record.merchant_id},
      ${record.merchant_reference ?? null},
      ${record.processor},
      ${record.status},
      ${record.approved},
      ${record.amount ?? null},
      ${record.currency ?? null},
      ${record.transaction_id ?? null},
      ${record.processor_reference ?? null},
      ${record.message ?? null},
      ${JSON.stringify(record.raw ?? null)}::jsonb,
      ${JSON.stringify(record.audit ?? null)}::jsonb
    )
  `);
}

export async function listTransactions(merchantId?: string) {
  await db.execute(sql`
    create table if not exists payment_transactions (
      id uuid primary key default gen_random_uuid(),
      merchant_id text not null,
      merchant_reference text,
      processor text not null,
      status text not null,
      approved boolean not null default false,
      amount integer,
      currency text,
      transaction_id text,
      processor_reference text,
      message text,
      raw jsonb,
      audit jsonb,
      created_at timestamptz not null default now()
    )
  `);

  if (merchantId) {
    const result = await db.execute(sql`
      select *
      from payment_transactions
      where merchant_id = ${merchantId}
      order by created_at desc
      limit 100
    `);
    return result.rows;
  }

  const result = await db.execute(sql`
    select *
    from payment_transactions
    order by created_at desc
    limit 100
  `);
  return result.rows;
}
