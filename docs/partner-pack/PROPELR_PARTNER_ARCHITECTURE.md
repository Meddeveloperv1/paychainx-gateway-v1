# Propelr Partner Architecture

## Overview

PaychainX is a dual-rail payment orchestration gateway designed to:

- route transactions across fiat and digital rails
- enforce deterministic execution policies
- provide replay-safe idempotency
- generate cryptographic proof of execution via a PQ sidecar

The system separates:

- Payment Execution fast path
- Proof Generation governance path

## Core Components

### 1. Gateway Fast Path
- Handles all `/v1/payments/*` requests
- Integrates with CyberSource active rail
- Bank rail scaffolded and currently disabled
- Enforces idempotency with Redis-backed replay
- Returns immediate payment result

### 2. Redis Idempotency Layer
- Prevents duplicate charges
- Handles replay requests
- Returns cached responses in low single-digit milliseconds on replay path

### 3. PQ Sidecar Governance Layer
- Receives proof requests
- Returns `proof_id`
- Runs independently of payment success in async mode
- Required for execution in strict mode

### 4. PQ Modes

#### Async Audit Mode
- Payment executes immediately
- Proof generated asynchronously
- Optimized for production throughput

#### Strict Mode
- Proof submission must succeed
- If sidecar fails the transaction fails closed
- Used for high-assurance merchants and policy-governed flows

### 5. Proof Vault
Stores:
- `proof_id`
- `payment_attempt_id`
- `merchant_reference`
- `proof_hash`
- `policy_snapshot`
- verification metadata

Provides:
- queryable proofs
- verification API
- downloadable cryptographic receipt

## Execution Flow

1. Client calls `/v1/payments/sale`
2. Gateway authenticates request and enforces idempotency
3. Gateway resolves merchant routing and processor credentials
4. Payment sent to CyberSource
5. Payment result returned immediately
6. PQ proof request sent to sidecar
7. Proof stored in Proof Vault
8. Verification and receipt available via API

## Current Active Configuration

- Default processor: CyberSource
- Bank rail: disabled
- Redis replay: enabled
- PQ sidecar: enabled
- PQ async mode: enabled
- PQ strict mode: enabled for selected merchants
- Proof Vault: enabled
