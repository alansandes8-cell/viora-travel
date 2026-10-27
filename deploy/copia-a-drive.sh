#!/usr/bin/env bash
# Sube las copias de seguridad diarias (carpeta backups/) a Google Drive con rclone.
# Requiere haber configurado rclone con un remoto llamado "drive" (ver docs/DESPLIEGUE-GRATIS.md).
# Pensado para correr una vez por día con cron.
set -euo pipefail
cd "$(dirname "$0")/.."
rclone copy backups drive:viora-backups --max-age 72h
# Conserva 30 días en Drive.
rclone delete drive:viora-backups --min-age 30d
