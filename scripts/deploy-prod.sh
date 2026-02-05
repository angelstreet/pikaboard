#!/bin/bash
# Deploy PikaBoard PRODUCTION (main branch)
set -e

PIKABOARD_DIR="/home/jndoye/.openclaw/workspace/pikaboard"
cd "$PIKABOARD_DIR"

echo "🚀 Deploying PikaBoard PRODUCTION..."

# Stash and checkout main
git stash --include-untracked 2>/dev/null || true
git fetch origin main
git checkout main
git pull origin main

# Get git info
BRANCH=$(git branch --show-current)
COMMIT=$(git rev-parse --short HEAD)
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")

echo "📦 Version: $VERSION ($BRANCH) @ $COMMIT"

# Build frontend
cd frontend
npm install --silent
VITE_VERSION=$VERSION VITE_BRANCH=$BRANCH VITE_COMMIT=$COMMIT \
  VITE_BASE_PATH=/pikaboard/ npm run build

# Reload nginx
sudo systemctl reload nginx

echo "✅ PRODUCTION deployed: v$VERSION ($BRANCH) @ $COMMIT"
echo "   URL: https://65.108.14.251:8080/pikaboard/"
