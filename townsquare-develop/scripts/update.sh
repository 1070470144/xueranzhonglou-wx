#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/townsquare/townsquare-develop}"
BRANCH="${BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/opt/townsquare/config/townsquare.env}"

echo "Entering project directory: ${APP_DIR}"
cd "${APP_DIR}"

if [[ -f "${ENV_FILE}" ]]; then
  echo "Loading build env from ${ENV_FILE}..."
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
else
  echo "Build env file not found: ${ENV_FILE}" >&2
  echo "Create it before running the update script." >&2
  exit 1
fi

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
