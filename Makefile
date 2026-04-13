.PHONY: dev test lint typecheck build docker

dev:
	pnpm dev

test:
	pnpm vitest run

lint:
	pnpm lint

typecheck:
	pnpm tsc --noEmit

build:
	pnpm build

docker:
	docker compose up --build
