import { db } from './dist/db/client.js';

await db.execute(`
create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  url text not null,
  event_types text not null default 'payment.succeeded,payment.failed,proof.generated',
  is_enabled boolean not null default true,
  signing_secret text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
`);

await db.execute(`
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  endpoint_id uuid not null,
  event_type text not null,
  event_id text not null,
  payload text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_http_status integer,
  last_error text,
  next_attempt_at timestamp default now(),
  delivered_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
`);

console.log('webhook tables ensured');
