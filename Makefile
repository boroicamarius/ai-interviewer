.PHONY: help install env api web test lint build up down logs clean

help:
	@echo "AI Interviewer"
	@echo ""
	@echo "  make install   Install backend (venv) and frontend dependencies"
	@echo "  make env       Create .env from .env.example if missing"
	@echo "  make api       Run FastAPI on http://localhost:8000"
	@echo "  make web       Run Next.js on http://localhost:3000"
	@echo "  make test      Run backend tests"
	@echo "  make lint      Lint the frontend"
	@echo "  make build     Production build of the frontend"
	@echo "  make up        docker compose up --build"
	@echo "  make down      docker compose down"
	@echo "  make logs      Follow compose logs"
	@echo "  make clean     Remove local caches and build output"

env:
	@test -f .env || cp .env.example .env
	@echo "Using $(shell pwd)/.env"

install: env
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt
	cd frontend && npm install

api: env
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

web:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/python -m pytest

lint:
	cd frontend && npm run lint

build:
	cd frontend && npm run build

up: env
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

clean:
	rm -rf frontend/.next frontend/out backend/.pytest_cache backend/.ruff_cache
	find backend -type d -name __pycache__ -prune -exec rm -rf {} +
