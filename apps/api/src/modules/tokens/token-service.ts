import crypto from 'crypto';
import { db } from '../../dist/db/client.js';

function sha256(v: string) {
  return crypto.createHash('sha256').update(v).digest('hex');
}

function tokenId() {
  return 'ptok_' + crypto.randomBytes(18).toString('hex');
}

export async function createToken(input: any) {
  const id = tokenId();
  const fp = sha256(input.fingerprint_source);

  const r = await db.execute(
    `insert into payment_tokens (
      token_id, customer_id, merchant_id,
      processor, processor_token,
      fingerprint_sha256, brand, last4,
      exp_month, exp_year, billing_name, billing_zip, metadata
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb
    ) returning token_id, brand, last4, exp_month, exp_year, status`,
    [
      id,
      input.customer_id || null,
      input.merchant_id || null,
      input.processor || 'cybersource',
      input.processor_token || null,
      fp,
      input.brand || null,
      input.last4 || null,
      input.exp_month || null,
      input.exp_year || null,
      input.billing_name || null,
      input.billing_zip || null,
      JSON.stringify(input.metadata || {})
    ]
  );

  return r.rows[0];
}

export async function getToken(id: string) {
  const r = await db.execute(
    `select * from payment_tokens where token_id = $1 limit 1`,
    [id]
  );
  return r.rows[0] || null;
}

export async function revokeToken(id: string) {
  const r = await db.execute(
    `update payment_tokens set status='revoked', revoked_at=now()
     where token_id=$1 returning token_id,status`,
    [id]
  );
  return r.rows[0] || null;
}
