import { db } from './dist/db/client.js';

await db.execute(`
create table if not exists merchant_capabilities (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique,
  allowed_currencies text not null default 'USD',
  allowed_channels text not null default 'ecom',
  default_processor text not null default 'cybersource',
  cybersource_enabled boolean not null default true,
  bank_rail_enabled boolean not null default false,
  pq_enabled boolean not null default true,
  pq_strict_mode boolean not null default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
`);

console.log('merchant_capabilities ensured');
