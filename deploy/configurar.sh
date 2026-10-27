#!/usr/bin/env bash
# Crea el archivo .env con contraseñas seguras generadas automáticamente.
# Uso: bash deploy/configurar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo "Ya existe un archivo .env. Si querés regenerarlo, borralo primero (rm .env)."
  exit 1
fi

read -rp "Dominio de la web (ej.: viora.duckdns.org o vioratravel.com): " DOMAIN
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%/}"
read -rp "WhatsApp de la agencia (formato internacional, sin +) [5491163716817]: " WA
WA="${WA:-5491163716817}"
read -rp "Email de la agencia [alansandesmkt@gmail.com]: " MAIL
MAIL="${MAIL:-alansandesmkt@gmail.com}"

gen() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

cat > .env <<ENV
DOMAIN=$DOMAIN
APP_URL=https://$DOMAIN
DB_PASSWORD=$(gen 32)
PUBLIC_DB_PASSWORD=$(gen 32)
SESSION_SECRET=$(gen 64)

AGENCY_WHATSAPP=$WA
AGENCY_EMAIL=$MAIL
AGENCY_LEGAL_ID=

# Opcionales (completar cuando las tengas; después: bash deploy/actualizar.sh)
ANTHROPIC_API_KEY=
AI_MODEL=claude-opus-5-5
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
YOUTUBE_API_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
ENV
chmod 600 .env
echo "✓ Archivo .env creado con contraseñas seguras (no lo compartas con nadie)."
