# Propelr Executive Overview

PaychainX is an API-native payment orchestration gateway with a built-in cryptographic proof layer.

The platform currently supports a live CyberSource payment rail, Redis-backed replay-safe idempotency, a PQ sidecar for proof submission, strict and async proof policies, and a Proof Vault for proof retrieval, verification, and receipt generation.

The system is designed around two execution layers:

1. payment execution fast path
2. cryptographic governance and proof path

This architecture allows PaychainX to preserve production payment performance while also producing durable, queryable proof artifacts tied to each payment attempt.

## Current Live Capabilities

- live CyberSource sale execution
- replay-safe idempotency with Redis
- strict and async PQ proof modes
- strict merchant fail-closed proof enforcement
- proof status lookup by merchant reference
- proof retrieval by proof id
- proof verification endpoint
- downloadable cryptographic receipt payload
- operational status endpoint

## Current Configuration Summary

- default processor: CyberSource
- bank rail: disabled
- PQ sidecar: enabled
- PQ strict mode: available and enforced for selected merchants
- Proof Vault: active
- evidence bundle object storage: not yet enabled

## Intended Partner Outcome

Propelr can evaluate PaychainX as:
- a payment orchestration layer
- a deterministic replay-safe payment gateway
- a cryptographic proof and receipt layer
- a future dual-rail integration point for additional processors and bank rails

