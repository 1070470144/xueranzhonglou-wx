#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/townsquare/townsquare-develop}"
BRANCH="${BRANCH:-main}"

echo "Entering project directory: ${APP_DIR}"
cd "${APP_DIR}"

echo "Fetching latest code from origin/${BRANCH}..."
git fetch origin "${BRANCH}"

echo "Resetting working tree to origin/${BRANCH}..."
git reset --hard "origin/${BRANCH}"

echo "Rebuilding and restarting Docker services..."
docker compose up -d --build

echo "Removing unused Docker images..."
docker image prune -f

echo "Current service status:"
docker compose ps

echo "Update completed."
