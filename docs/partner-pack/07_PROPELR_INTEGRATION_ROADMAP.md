# Propelr Integration Roadmap

## Phase 1 Current Gateway Validation
- validate live payment execution
- validate API key auth model
- validate Redis replay-safe idempotency
- validate PQ sidecar health and proof generation
- validate status endpoint and proof APIs

## Phase 2 Merchant and Credential Alignment
- confirm merchant onboarding shape
- align processor credential ownership model
- define partner-specific merchant mapping
- define production credential exchange workflow

## Phase 3 Bank Rail Activation
- enable bank rail execution
- validate routing logic
- validate merchant routing controls
- confirm partner-specific bank rail requirements

## Phase 4 Production PQ Engine
- replace sidecar stub with production service
- add stronger proof versioning
- add signature generation
- add robust verification lifecycle

## Phase 5 Evidence Bundle Durability
- enable immutable object storage for evidence bundles
- populate `evidence_bundle_uri`
- add downloadable proof artifacts beyond metadata receipt

## Phase 6 Partner Production Readiness
- production credential cutover
- monitoring and status validation
- operational runbook
- partner acceptance tests
