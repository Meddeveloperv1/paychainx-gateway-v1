import { db } from './dist/db/client.js';

await db.execute(`
create table if not exists proof_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  merchant_reference text not null,
  payment_intent_id uuid,
  payment_attempt_id uuid not null,
  payload text not null,
  payload_hash text not null,
  mode text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
`);

console.log('proof_jobs ensured');
