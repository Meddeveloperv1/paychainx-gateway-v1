# Propelr Partner Pack

This package provides a partner-ready integration view of the PaychainX production gateway without exposing internal source code.

## Included Documents

1. `01_PROPELR_EXECUTIVE_OVERVIEW.md`
2. `02_PROPELR_ARCHITECTURE.md`
3. `03_PROPELR_API_SPEC.md`
4. `04_PROPELR_SAMPLE_CURLS.md`
5. `05_PROPELR_ROUTING_MODEL.md`
6. `06_PROPELR_PQ_PROOF_MODEL.md`
7. `07_PROPELR_INTEGRATION_ROADMAP.md`
8. `08_PROPELR_HANDOFF_SCOPE.md`

## Current Live System State

- CyberSource payment rail active
- Bank rail scaffolded but disabled
- Redis-backed replay-safe idempotency active
- PQ sidecar active
- Async PQ proof mode active
- Strict PQ proof mode active for selected merchants
- Proof Vault persistence active
- Proof verification API active
- Cryptographic receipt API active
- Runtime status endpoint active

## Intended Audience

This package is for Propelr integration, product, solution architecture, and partner evaluation teams.

## Delivery Model

This package is designed to support:
- technical review
- API validation
- routing and merchant mapping review
- staged integration planning

It is not a source-code handoff.
