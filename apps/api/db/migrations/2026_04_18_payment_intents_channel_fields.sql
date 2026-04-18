alter table payment_intents
  add column if not exists channel text not null default 'api',
  add column if not exists terminal_id text,
  add column if not exists device_id text;
