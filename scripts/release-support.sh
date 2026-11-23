#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

release=$(cd "$(dirname "$0")/.." && pwd -P)
root=/root/ai-support-releases
[[ "$release" == "$root/"* && "$release" != "$root/current" && "$release" != "$root/current-web" ]]
id=$(basename "$release")
[[ "$id" =~ ^launch-[a-f0-9]{7,40}$ ]]

exec 9>"$root/.support-release.lock"
flock -n 9
old_server=$(readlink -f "$root/current")
old_web=$(readlink -f "$root/current-web")
private_env=$(readlink -f "$old_server/.env.prod")
action_env=/root/ai-support-secrets/actions.env
mail_env=/root/ai-support-secrets/workspaces.env
[[ -f "$private_env" && -f "$action_env" ]]

project=ai-support-widget
server_image="$project-server:$id"
web_image="$project-web:$id"
domain=$(grep -E '^DOMAIN=' "$private_env" | cut -d= -f2-)
domain=${domain#\'}
domain=${domain%\'}
domain=${domain#\"}
domain=${domain%\"}
[[ "$domain" == support-ai.pontes.uk ]]

docker build -t "$server_image" -f "$release/Dockerfile.server" "$release"
docker build -t "$web_image" --build-arg "NEXT_PUBLIC_API_URL=https://$domain" -f "$release/Dockerfile.web" "$release"

# Check the new web image on a temporary loopback port before replacing production.
candidate=$(docker run -d --rm --publish 127.0.0.1::3000 "$web_image")
stop_candidate() { docker stop "$candidate" >/dev/null 2>&1 || true; }
trap stop_candidate EXIT
address=$(docker port "$candidate" 3000/tcp)
curl -fsS --retry 15 --retry-connrefused --retry-delay 1 "http://$address/" > /dev/null
curl -fsS "http://$address/signup" > /dev/null
curl -fsS "http://$address/downloads/ai-support-starter.zip" > /dev/null
stop_candidate
trap - EXIT

[[ "${1:-}" == '--activate' ]] || exit 0
[[ "$(readlink -f "$root/current")" == "$old_server" && "$(readlink -f "$root/current-web")" == "$old_web" ]]
db_id=$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=postgres)
server_id=$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=server)
web_id=$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=web)
[[ -n "$db_id" && -n "$server_id" && -n "$web_id" ]]

backup="/root/ops-backups/$id"
mkdir -p "$backup"
docker exec "$db_id" pg_dump -U aiwidget -d aiwidget -Fc > "$backup/database.dump"
docker exec -i "$db_id" pg_restore -l < "$backup/database.dump" > "$backup/database.contents"
docker tag "$(docker inspect -f '{{.Image}}' "$server_id")" "$project-server:before-$id"
docker tag "$(docker inspect -f '{{.Image}}' "$web_id")" "$project-web:before-$id"
printf 'services:\n  server:\n    image: %s\n  web:\n    image: %s\n' "$server_image" "$web_image" > "$release/images.override.yml"
printf 'services:\n  server:\n    image: %s\n  web:\n    image: %s\n' "$project-server:before-$id" "$project-web:before-$id" > "$backup/rollback.override.yml"
if [[ ! -L "$release/.env.prod" ]]; then ln -s "$private_env" "$release/.env.prod"; fi

compose=(docker compose -p "$project" --env-file "$private_env" --env-file "$action_env")
if [[ -f "$mail_env" ]]; then compose+=(--env-file "$mail_env"); fi

for migration in "$release"/server/src/migrations/00{5,6}-*.sql; do
  docker exec -i "$db_id" psql -v ON_ERROR_STOP=1 -1 -U aiwidget -d aiwidget < "$migration"
done

activate() {
  "${compose[@]}" -f "$release/docker-compose.prod.yml" -f "$release/docker-compose.actions.yml" \
    -f "$release/images.override.yml" up -d --no-deps --no-build --wait --wait-timeout 120 server web &&
  curl -fsS http://127.0.0.1:3005/api/health > /dev/null &&
  curl -fsS http://127.0.0.1:3005/api/workspace/availability > /dev/null &&
  curl -fsS http://127.0.0.1:3006/ > /dev/null
}
rollback() {
  "${compose[@]}" -f "$old_server/docker-compose.prod.yml" -f "$old_server/docker-compose.actions.yml" \
    -f "$backup/rollback.override.yml" up -d --no-deps --no-build --wait --wait-timeout 120 server web
}
if ! activate; then
  rollback
  exit 1
fi
for pointer in current current-web; do
  ln -s "$release" "$root/$pointer.$id"
  mv -Tf "$root/$pointer.$id" "$root/$pointer"
done
printf 'Activated %s on https://%s\n' "$id" "$domain"
