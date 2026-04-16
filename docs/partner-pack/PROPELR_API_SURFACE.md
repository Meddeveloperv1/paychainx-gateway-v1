# Propelr API Surface

## Authentication

All protected requests use:

- `x-api-key: <merchant_api_key>`

## Payments

### POST /v1/payments/sale
Creates a payment.

Expected fields:
- `merchant_reference`
- `amount`
- `currency`
- `payment_source`

Optional fields:
- `customer_email`
- `requested_processor`

Returns:
- payment id
- payment attempt id
- processor transaction id
- status
- amount and currency

## System

### GET /v1/system/status
Returns:
- build label
- build version
- active branch
- processor defaults
- bank rail enabled or disabled
- PQ enabled or disabled
- PQ strict mode enabled or disabled
- sidecar health
- cache flags

### GET /v1/system/whoami
Authenticated route returning current merchant auth context.

## PQ Proof Status

### GET /v1/pq/status/:merchant_reference
Returns:
- merchant reference
- current proof status object
- proof id if available
- mode async-audit or strict

## Proof Vault

### GET /v1/proofs/:proof_id
Returns the stored proof record.

### GET /v1/payments/:id/proof
Returns the proof associated with a payment attempt id.

### GET /v1/proofs/verify/:proof_id
Returns verification result for a proof id.

### POST /v1/proofs/verify
Body:
- `proof_id`

Returns verification result.

### GET /v1/proofs/:proof_id/receipt
Returns downloadable cryptographic receipt payload.

### GET /v1/merchants/:id/proofs
Returns proofs associated with a merchant id.
