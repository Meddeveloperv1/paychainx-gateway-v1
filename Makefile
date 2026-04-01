up:
	docker compose -f infra/compose/docker-compose.yml up -d

down:
	docker compose -f infra/compose/docker-compose.yml down

logs:
	docker compose -f infra/compose/docker-compose.yml logs -f

api:
	cd apps/api && npm run dev
