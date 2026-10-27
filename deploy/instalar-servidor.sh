#!/usr/bin/env bash
# Prepara un servidor Ubuntu (Oracle Cloud, Google Cloud u otro) para VIORA TRAVEL:
# instala Docker, agrega memoria de intercambio si el servidor es chico,
# abre los puertos 80/443 en el firewall interno y deja todo listo.
# Uso: bash deploy/instalar-servidor.sh
set -euo pipefail

echo "→ Actualizando el sistema…"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Servidores chicos (p. ej. e2-micro de Google, 1 GB): compilar la aplicación necesita
# más memoria, así que se agrega un archivo de intercambio (swap) de 4 GB.
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [ "$mem_kb" -lt 3000000 ] && [ ! -f /swapfile ]; then
  echo "→ Servidor con poca memoria: agregando 4 GB de memoria de intercambio…"
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
  echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/99-viora-swap.conf >/dev/null
  sudo sysctl -p /etc/sysctl.d/99-viora-swap.conf >/dev/null
fi

echo "→ Instalando Docker…"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "→ Abriendo puertos 80 y 443 en el firewall del servidor…"
# Las imágenes Ubuntu de Oracle traen reglas iptables que bloquean todo salvo SSH
# (en Google Cloud no hacen falta, pero no molestan).
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 1 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
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
