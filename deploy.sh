#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# ── Preflight checks ───────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy .env.prod.example to .env.prod and fill in real values."
  exit 1
fi

# Source env for variable substitution in nginx config
set -a; source "$ENV_FILE"; set +a

if [ -z "${DOMAIN:-}" ]; then
  echo "ERROR: DOMAIN not set in $ENV_FILE"
  exit 1
fi

echo "=== Deploying AI Support Widget ==="
echo "Domain: $DOMAIN"

# ── Render nginx config with DOMAIN ────────────────────────────
echo "→ Rendering nginx config..."
envsubst '${DOMAIN}' < nginx/nginx.conf.template > nginx/nginx.conf

# ── Build & start ──────────────────────────────────────────────
echo "→ Building images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "→ Starting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# ── Wait for DB to be healthy ──────────────────────────────────
echo "→ Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U aiwidget > /dev/null 2>&1; then
    echo "  PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: PostgreSQL did not become ready in 30s"
    docker compose -f "$COMPOSE_FILE" logs postgres
    exit 1
  fi
  sleep 1
done

# ── Enable pgvector extension ──────────────────────────────────
echo "→ Enabling pgvector extension..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U aiwidget -d aiwidget -c "CREATE EXTENSION IF NOT EXISTS vector;"

# ── Run migrations ─────────────────────────────────────────────
echo "→ Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U aiwidget -d aiwidget < server/src/migrations/001-init.sql

# ── Health check ───────────────────────────────────────────────
echo "→ Checking service health..."
sleep 5

if docker compose -f "$COMPOSE_FILE" exec -T server \
  wget -qO- http://localhost:3005/api/health 2>/dev/null | grep -q '"ok":true'; then
  echo "  Server: healthy"
else
  echo "  Server: NOT healthy (may still be starting)"
fi

# ── Status ─────────────────────────────────────────────────────
echo ""
echo "=== Service Status ==="
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "=== Deploy complete ==="
echo "Admin dashboard: https://$DOMAIN"
echo "API:             https://$DOMAIN/api/health"
echo "API docs:        https://$DOMAIN/api/docs"
echo ""
echo "Useful commands:"
echo "  Logs:    docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:    docker compose -f $COMPOSE_FILE down"
echo "  Rebuild: docker compose -f $COMPOSE_FILE up -d --build"
