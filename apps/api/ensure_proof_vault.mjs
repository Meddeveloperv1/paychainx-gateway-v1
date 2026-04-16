import { db } from './dist/db/client.js';

async function run() {
  try {
    await db.execute(`create extension if not exists pgcrypto;`);

    await db.execute(`
      create table if not exists proof_vault (
        id uuid primary key default gen_random_uuid(),
        proof_id text not null unique,
        payment_attempt_id uuid not null,
        merchant_id uuid not null,
        merchant_reference text not null,
        proof_hash text not null,
        hash_algorithm text default 'sha256',
        signature text,
        signature_algorithm text,
        proof_status text not null,
        request_fingerprint text,
        processor_response_fingerprint text,
        sidecar_version text,
        evidence_bundle_uri text,
        policy_snapshot text,
        created_at timestamp default now(),
        verified_at timestamp
      );
    `);

    console.log('proof_vault ensured');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
