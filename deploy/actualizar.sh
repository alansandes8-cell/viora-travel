#!/usr/bin/env bash
# Descarga la última versión del código y reinicia la plataforma (las migraciones corren solas).
# Uso: bash deploy/actualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
echo "✓ VIORA TRAVEL actualizada."
