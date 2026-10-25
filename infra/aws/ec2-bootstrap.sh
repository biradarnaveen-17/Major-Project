#!/usr/bin/env bash
# Bootstrap the BhoomiChain demonstrator backend on Ubuntu 24.04.
# Run as root (for example with: sudo bash infra/aws/ec2-bootstrap.sh).

set -Eeuo pipefail

readonly APP_DIR="/opt/bhoomichain"
readonly REPOSITORY_URL="https://github.com/biradarnaveen-17/Major-Project.git"
readonly BRANCH="codex/tunnel-and-registry-fixes"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 git openssl curl
systemctl enable --now docker

if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  git clone --depth 1 --branch "${BRANCH}" "${REPOSITORY_URL}" "${APP_DIR}"
fi

umask 077
cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=production
BACKEND_PORT=5000
MONGO_BIND_ADDRESS=127.0.0.1
GANACHE_BIND_ADDRESS=127.0.0.1
MONGO_INITDB_ROOT_USERNAME=land_admin
MONGO_INITDB_ROOT_PASSWORD=$(openssl rand -hex 24)
MONGO_DATABASE=land_registration_research
JWT_SECRET=$(openssl rand -hex 32)
# Replace this with the final Amplify HTTPS URL before public use.
CORS_ORIGIN=http://localhost:5173
EOF

cd "${APP_DIR}"
docker compose up -d --build mongo ganache deployer backend

echo "Waiting for the API health check..."
for _ in {1..30}; do
  if curl --fail --silent http://127.0.0.1:5000/health > /dev/null; then
    echo "Backend started successfully."
    exit 0
  fi
  sleep 2
done

echo "The API did not become healthy. Inspect logs with: docker compose logs backend"
exit 1
