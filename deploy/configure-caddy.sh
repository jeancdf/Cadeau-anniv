#!/usr/bin/env bash
set -Eeuo pipefail

PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-gift-finder.duckdns.org}"
UPSTREAM="${CADDY_UPSTREAM:-gift-finder-frontend:80}"
CADDY_COMPOSE_FILE="${CADDY_COMPOSE_FILE:-/home/deploy/qr-compose.prod.yml}"
CADDY_CONTAINER="${CADDY_CONTAINER:-qr_caddy}"
BACKUP_FILE="${CADDY_COMPOSE_FILE}.gift-finder.bak"

if [[ ! -r "$CADDY_COMPOSE_FILE" || ! -w "$CADDY_COMPOSE_FILE" ]]; then
  echo "Le fichier Caddy n'est pas accessible en lecture/écriture: $CADDY_COMPOSE_FILE" >&2
  exit 1
fi

reload_caddy() {
  docker compose -f "$CADDY_COMPOSE_FILE" up -d --no-deps --force-recreate caddy
  docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile

  if ! docker exec "$CADDY_CONTAINER" grep -Fq "$PUBLIC_DOMAIN" /etc/caddy/Caddyfile; then
    echo "La route Caddy n'a pas été chargée dans le conteneur: $PUBLIC_DOMAIN" >&2
    return 1
  fi
}

if grep -Fq "$PUBLIC_DOMAIN" "$CADDY_COMPOSE_FILE"; then
  if docker exec "$CADDY_CONTAINER" grep -Fq "$PUBLIC_DOMAIN" /etc/caddy/Caddyfile; then
    echo "Route Caddy déjà active pour $PUBLIC_DOMAIN"
    exit 0
  fi

  reload_caddy
  exit 0
fi

cp --preserve=mode,ownership,timestamps "$CADDY_COMPOSE_FILE" "$BACKUP_FILE"

python3 - "$CADDY_COMPOSE_FILE" "$PUBLIC_DOMAIN" "$UPSTREAM" <<'PYTHON'
import os
import re
import sys
from pathlib import Path

compose_path = Path(sys.argv[1])
domain = sys.argv[2]
upstream = sys.argv[3]
content = compose_path.read_text(encoding='utf-8')
marker = "configs:\n  caddyfile:\n    content: |\n"

marker_index = content.find(marker)
if marker_index < 0:
    raise SystemExit("Section configs.caddyfile.content introuvable")

content_start = marker_index + len(marker)
next_section = re.search(
    r"(?m)^(?=[A-Za-z][A-Za-z0-9_-]*:\s*(?:#.*)?$)",
    content[content_start:]
)
insert_at = content_start + next_section.start() if next_section else len(content)
route = (
    f"\n      {domain} {{\n"
    f"        reverse_proxy {upstream}\n"
    "      }\n"
)

updated = content[:insert_at].rstrip() + route + "\n" + content[insert_at:].lstrip("\n")
temporary_path = compose_path.with_name(f".{compose_path.name}.gift-finder.tmp")
temporary_path.write_text(updated, encoding='utf-8')
os.chmod(temporary_path, compose_path.stat().st_mode)
os.replace(temporary_path, compose_path)
PYTHON

if ! docker compose -f "$CADDY_COMPOSE_FILE" config --quiet; then
  cp --preserve=mode,ownership,timestamps "$BACKUP_FILE" "$CADDY_COMPOSE_FILE"
  echo "Configuration Caddy invalide, sauvegarde restaurée" >&2
  exit 1
fi

if ! reload_caddy; then
  cp --preserve=mode,ownership,timestamps "$BACKUP_FILE" "$CADDY_COMPOSE_FILE"
  docker compose -f "$CADDY_COMPOSE_FILE" up -d --no-deps caddy || true
  echo "Le redémarrage Caddy a échoué, sauvegarde restaurée" >&2
  exit 1
fi

echo "Route Caddy ajoutée pour $PUBLIC_DOMAIN (sauvegarde: $BACKUP_FILE)"
