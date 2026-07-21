#!/usr/bin/env bash
set -Eeuo pipefail

: "${APP_SHA:?APP_SHA est requis}"
: "${ARCHIVE_PATH:?ARCHIVE_PATH est requis}"
: "${ENV_PATH:?ENV_PATH est requis}"

if [[ ! "$APP_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "SHA de déploiement invalide" >&2
  exit 1
fi

EXPECTED_ARCHIVE="/tmp/gift-finder-${APP_SHA}.tar.gz"
EXPECTED_ENV="/tmp/gift-finder-${APP_SHA}.env"
if [[ "$ARCHIVE_PATH" != "$EXPECTED_ARCHIVE" || "$ENV_PATH" != "$EXPECTED_ENV" ]]; then
  echo "Chemin temporaire inattendu" >&2
  exit 1
fi

APP_ROOT="/home/deploy/gift-finder"
RELEASES_DIR="$APP_ROOT/releases"
RELEASE_DIR="$RELEASES_DIR/$APP_SHA"
STAGING_DIR=""

cleanup() {
  rm -f -- "$EXPECTED_ARCHIVE" "$EXPECTED_ENV"
  if [[ -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
    rm -rf -- "$STAGING_DIR"
  fi
}
trap cleanup EXIT

umask 077
mkdir -p "$RELEASES_DIR"

if [[ ! -d "$RELEASE_DIR" ]]; then
  STAGING_DIR="$(mktemp -d "$RELEASES_DIR/.staging-${APP_SHA}.XXXXXX")"
  tar -xzf "$EXPECTED_ARCHIVE" -C "$STAGING_DIR"
  mv "$STAGING_DIR" "$RELEASE_DIR"
  STAGING_DIR=""
fi

install -m 600 "$EXPECTED_ENV" "$APP_ROOT/.env"

docker network inspect qr-code_app_net >/dev/null

docker compose \
  --project-name gift-finder \
  --env-file "$APP_ROOT/.env" \
  -f "$RELEASE_DIR/docker-compose.prod.yml" \
  up -d --build --remove-orphans --wait --wait-timeout 240

PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-gift-finder.duckdns.org}" \
  bash "$RELEASE_DIR/deploy/configure-caddy.sh"

healthy=false
for attempt in $(seq 1 24); do
  if curl --fail --silent --show-error "https://${PUBLIC_DOMAIN:-gift-finder.duckdns.org}/api/health" >/dev/null; then
    healthy=true
    break
  fi
  echo "Santé publique indisponible (tentative $attempt/24), nouvel essai dans 5 s"
  sleep 5
done

if [[ "$healthy" != true ]]; then
  echo "Le contrôle de santé public a échoué" >&2
  exit 1
fi

ln -sfn "releases/$APP_SHA" "$APP_ROOT/current"

docker compose \
  --project-name gift-finder \
  --env-file "$APP_ROOT/.env" \
  -f "$RELEASE_DIR/docker-compose.prod.yml" \
  ps

echo "Déploiement Gift Finder terminé: $APP_SHA"
