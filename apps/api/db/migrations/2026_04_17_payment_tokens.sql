create table if not exists payment_tokens (
  id uuid primary key default gen_random_uuid(),
  token_id text not null unique,
  customer_ref text,
  merchant_id uuid not null,
  processor text not null default 'cybersource',
  processor_token_ref text not null,
  fingerprint_sha256 text not null,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  billing_name text,
  billing_zip text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_payment_tokens_token_id on payment_tokens(token_id);
create index if not exists idx_payment_tokens_customer_ref on payment_tokens(customer_ref);
create index if not exists idx_payment_tokens_merchant_id on payment_tokens(merchant_id);
create index if not exists idx_payment_tokens_status on payment_tokens(status);
