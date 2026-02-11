#!/usr/bin/env bash
# PikaBoard setup script.
# Safe defaults:
# - deterministic dependency install (npm ci when lockfile exists)
# - preflight check for risky lifecycle scripts in local package.json files
# - strict shell mode

set -euo pipefail

echo "Setting up PikaBoard..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cd "${REPO_ROOT}"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}"
    exit 1
  fi
}

require_cmd node
require_cmd npm

NODE_VERSION="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [ "${NODE_VERSION}" -lt 18 ]; then
  echo "Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

echo "Node.js $(node -v)"
echo "npm $(npm -v)"

check_local_package_scripts() {
  local pkg_path="$1"
  if [ ! -f "${pkg_path}" ]; then
    return 0
  fi
  node -e '
    const fs = require("fs");
    const pkgPath = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const scripts = pkg.scripts || {};
    const risky = ["preinstall", "install", "postinstall", "prepare", "prepublish", "prepublishOnly"];
    const found = risky.filter((k) => Object.prototype.hasOwnProperty.call(scripts, k));
    if (found.length) {
      console.error(`Blocked: ${pkgPath} declares lifecycle scripts: ${found.join(", ")}`);
      process.exit(2);
    }
  ' "${pkg_path}"
}

echo "Running preflight checks..."
check_local_package_scripts "package.json"
check_local_package_scripts "backend/package.json"
check_local_package_scripts "frontend/package.json"

install_project() {
  local dir="$1"
  echo "Installing ${dir}..."
  pushd "${dir}" >/dev/null
  if [ -f "package-lock.json" ]; then
    npm ci --no-audit --fund=false
  else
    npm install --no-audit --fund=false
  fi
  npm run build
  popd >/dev/null
}

install_project "backend"
install_project "frontend"

generate_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  node -e "const crypto = require('crypto'); process.stdout.write(crypto.randomBytes(32).toString('hex'));"
}

if [ ! -f "backend/.env" ]; then
  echo "Creating backend/.env..."
  umask 077
  cat > backend/.env <<EOF
DATABASE_PATH=./pikaboard.db
PIKABOARD_API_TOKEN=$(generate_token)
PORT=3001
EOF
  echo "Created backend/.env with a random PIKABOARD_API_TOKEN"
else
  echo "backend/.env already exists"
fi

echo
echo "Setup complete."
echo "Start backend: cd backend && npm start"
echo "Dashboard: http://localhost:3001"
