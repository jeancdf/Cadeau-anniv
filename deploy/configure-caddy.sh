#!/usr/bin/env bash
set -Eeuo pipefail
# Read-only, ADVISORY check of the shared proxy. Routes and the proxy lifecycle
# belong exclusively to jeancdf/caddy-config; this script never writes Caddy.
# Works before (project qr-code) and after (project vps-caddy) the migration,
# and never blocks a deployment: the public health check remains the gate.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$script_dir/../scripts/check-shared-proxy.py"   --site "${PUBLIC_DOMAIN:-gift-finder.duckdns.org}" "${CADDY_UPSTREAM:-gift-finder-frontend:80}"   --network qr-code_app_net   || echo "AVERTISSEMENT: contrôle du proxy partagé non concluant (lecture seule, déploiement poursuivi)" >&2
exit 0
