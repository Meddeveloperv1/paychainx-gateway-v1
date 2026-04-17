create table if not exists payment_tokens (
  id uuid primary key default gen_random_uuid(),
  token_id text not null unique,
  customer_id text,
  merchant_id text,
  processor text not null default 'cybersource',
  processor_token text,
  fingerprint_sha256 text not null,
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  billing_name text,
  billing_zip text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_payment_tokens_customer_id on payment_tokens(customer_id);
create index if not exists idx_payment_tokens_merchant_id on payment_tokens(merchant_id);
create index if not exists idx_payment_tokens_status on payment_tokens(status);
create index if not exists idx_payment_tokens_fingerprint_sha256 on payment_tokens(fingerprint_sha256);
