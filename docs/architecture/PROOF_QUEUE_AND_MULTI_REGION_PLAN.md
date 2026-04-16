# Proof Queue and Multi-Region Plan

## Phase NS-1 — Stateless Gateway

- remove all in-memory authority
- externalize idempotency to Redis
- ensure gateway nodes are horizontally scalable

## Phase NS-2 — Proof Queue

- introduce proof job queue
- enqueue proof requests from payment flow
- decouple proof persistence from hot path

## Phase NS-3 — Proof Worker

- process queued proof jobs
- persist to Proof Vault
- store evidence bundle URI
- retry failures with backoff
- dead-letter queue for failures

## Phase NS-4 — Durable Storage

- Postgres stores metadata
- object storage stores full evidence bundle
- receipt reconstruction uses both

## Phase NS-5 — Multi-Region

- deploy gateway per region
- deploy Redis cluster or global strategy
- deploy proof workers per region
- regional failover strategy

## Phase NS-6 — Processor Expansion

- enable bank rail
- multi-processor routing
- merchant-level routing control

## Performance Goal

- maintain sub-5ms replay path
- keep payment hot path independent from proof persistence
- scale proof system independently

## Governance

Strict PQ mode must:
- require proof submission
- fail closed if unavailable

Async mode must:
- never block payment execution
