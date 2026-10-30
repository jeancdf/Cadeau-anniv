#!/usr/bin/env bash
set -Eeuo pipefail
# Compatibility entrypoint: routes now belong exclusively to caddy-config.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$script_dir/../scripts/check-shared-proxy.py" \
  --site "${PUBLIC_DOMAIN:-gift-finder.duckdns.org}" "${CADDY_UPSTREAM:-gift-finder-frontend:80}" \
  --network qr-code_app_net
