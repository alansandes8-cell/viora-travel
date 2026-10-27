#!/usr/bin/env bash
# Prepara un servidor Ubuntu (Oracle Cloud u otro) para VIORA TRAVEL:
# instala Docker, abre los puertos 80/443 en el firewall interno y deja todo listo.
# Uso: bash deploy/instalar-servidor.sh
set -euo pipefail

echo "→ Actualizando el sistema…"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "→ Instalando Docker…"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "→ Abriendo puertos 80 y 443 en el firewall del servidor…"
# Las imágenes Ubuntu de Oracle traen reglas iptables que bloquean todo salvo SSH.
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 5 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo netfilter-persistent save

echo "→ Herramientas útiles (openssl, rclone para copias en Google Drive)…"
sudo apt-get install -y openssl git curl
if ! command -v rclone >/dev/null 2>&1; then
  curl -fsSL https://rclone.org/install.sh | sudo bash
fi

echo
echo "✓ Servidor preparado."
echo "  IMPORTANTE: cerrá la sesión SSH (escribí: exit) y volvé a entrar para que Docker funcione sin sudo."
