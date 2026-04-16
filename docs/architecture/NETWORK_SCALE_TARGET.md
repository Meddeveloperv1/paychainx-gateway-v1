# Network Scale Target

## Objective

PaychainX is being architected for network-scale payment throughput with a target capacity of up to $150B/day in settlement volume.

This requires a transition from single-gateway architecture to distributed, horizontally scalable infrastructure.

## Core Principles

- Stateless API gateway nodes
- Redis-first coordination and replay authority
- Queue-decoupled proof persistence
- Durable, queryable Proof Vault
- Immutable evidence bundle storage
- Multi-region deployment readiness
- Processor-agnostic routing layer
- Strict fail-closed governance for high-assurance merchants

## System Layers

1. API Gateway (stateless)
2. Redis coordination layer
3. Payment processor adapters
4. PQ proof sidecar
5. Proof job queue
6. Proof worker fleet
7. Proof Vault (Postgres)
8. Object storage (evidence bundles)

## Current Status

Implemented:
- CyberSource payment rail
- Redis replay-safe idempotency
- PQ async + strict modes
- Proof Vault APIs
- Cryptographic receipt generation

Planned:
- queue-based proof persistence
- multi-region runtime
- bank rail enablement
- durable object storage for evidence bundles

## Design Constraint

No blockchain dependency. All proofs must remain API-native, queryable, and enterprise-grade.
