# PaychainX Gateway V1

PaychainX Gateway V1 is a token-first orchestration gateway that exposes a normalized merchant payments API, routes day-one payment execution through CyberSource, and adds policy enforcement, idempotency, ledgering, webhook normalization, and tamper-evident audit controls.

## Current status
- Day 1 backend foundation complete
- Fastify API working
- Swagger docs working
- Docker Compose running Postgres and Redis
- GitHub company SSOT established

## Run infrastructure
docker compose -f infra/compose/docker-compose.yml up -d

## Run API
cd apps/api && npm run dev
