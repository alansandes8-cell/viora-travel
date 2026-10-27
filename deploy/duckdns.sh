#!/usr/bin/env bash
# Mantiene actualizada la IP del subdominio gratuito de DuckDNS.
# Uso (lo agrega la guía al cron): bash deploy/duckdns.sh SUBDOMINIO TOKEN
set -euo pipefail
curl -fsS "https://www.duckdns.org/update?domains=$1&token=$2&ip=" >/dev/null
