# Propelr Handoff Scope

## Purpose

This package provides a partner-ready integration view of PaychainX without exposing repository source code.

## Included

- executive overview
- architecture summary
- API surface
- sample curls
- routing model
- PQ proof model
- integration roadmap

## Not Included

- repository access
- raw internal source handoff
- internal-only implementation scripts
- internal development workflow notes

## Current Production Scope

Active now:
- CyberSource payment rail
- Redis replay-safe idempotency
- PQ sidecar
- async proof mode
- strict proof mode
- Proof Vault persistence
- proof verification API
- receipt API
- runtime status endpoint

Planned next:
- bank rail enablement
- production PQ engine beyond stub
- durable evidence bundle object storage

## Recommended Next Joint Steps

1. review current API surface
2. review proof and receipt model
3. align merchant and credential mapping
4. define bank rail activation path
5. define production PQ engine replacement plan
6. define evidence bundle storage path
