# Propelr API Specification

## Authentication

Protected routes use:

- Header: `x-api-key`

## Payments

### POST /v1/payments/sale

Creates a payment attempt and returns the payment result.

#### Request body
- `merchant_reference` string required
- `amount` integer required
- `currency` string required
- `payment_source` object required
- `customer_email` string optional
- `requested_processor` string optional

#### Example response fields
- `id`
- `merchant_reference`
- `status`
- `amount`
- `currency`
- `processor`
- `processor_transaction_id`
- `payment_attempt_id`
- `created_at`
- `error_message`

## System

### GET /v1/system/status

Returns operational status and build metadata.

#### Example fields
- `ok`
- `build_label`
- `build_version`
- `active_branch`
- `default_processor`
- `bank_rail_enabled`
- `redis_idempotency_enabled`
- `pq_enabled`
- `pq_audit_only`
- `pq_strict_mode`
- `pq_sidecar`

### GET /v1/system/whoami

Authenticated route returning merchant auth context.

## PQ Proof Status

### GET /v1/pq/status/:merchant_reference

Returns proof status associated with merchant reference.

#### Example fields
- `ok`
- `merchant_reference`
- `pq_proof`
  - `merchantReference`
  - `payloadHash`
  - `status`
  - `mode`
  - `proofId`
  - `updatedAt`

## Proof Vault

### GET /v1/proofs/:proof_id

Returns persisted proof row.

### GET /v1/payments/:id/proof

Returns proof associated with payment attempt id.

### GET /v1/proofs/verify/:proof_id

Returns verification summary.

### POST /v1/proofs/verify

#### Request body
- `proof_id`

Returns verification summary.

### GET /v1/proofs/:proof_id/receipt

Returns cryptographic receipt payload.

### GET /v1/merchants/:id/proofs

Returns list of proofs for merchant id.
