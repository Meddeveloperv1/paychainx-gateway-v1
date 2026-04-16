# Propelr Architecture

## System Overview

PaychainX is structured as a modular gateway with separate execution and proof layers.

### Core Components

#### 1. API Gateway
Handles payment requests and core authenticated API traffic.

Primary functions:
- request authentication
- merchant context resolution
- idempotency enforcement
- processor routing
- payment execution
- proof submission triggering

#### 2. Processor Adapters
Current:
- CyberSource active

Planned:
- bank rail adapter active after enablement

#### 3. Redis Idempotency Layer
Provides:
- in-flight request protection
- replay-safe response reuse
- duplicate execution prevention

#### 4. PQ Sidecar
Receives proof requests and returns proof identifiers.

Used for:
- async proof mode
- strict proof mode
- proof lifecycle generation

#### 5. Proof Vault
Stores durable proof records in Postgres and exposes:
- proof retrieval
- verification
- receipt generation

#### 6. System Status Layer
Exposes operational state including:
- build label
- build version
- active branch
- default processor
- bank rail enabled state
- PQ state
- sidecar health

## Execution Modes

### Payment Fast Path
- authenticate request
- resolve merchant and routing
- execute payment
- return payment result

### Proof Governance Path
- build proof request
- submit to sidecar
- persist proof record
- expose proof and receipt via API

## PQ Modes

### Async Audit Mode
- payment executes immediately
- proof submission occurs without blocking payment result

### Strict Mode
- proof submission required
- if sidecar is unavailable or proof submission fails, request fails closed

## Current Production Shape

- active rail: CyberSource
- bank rail scaffolded but disabled
- Redis replay active
- strict PQ mode working
- Proof Vault API layer working
