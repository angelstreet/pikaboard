#!/bin/bash
# Deploy PikaBoard PRODUCTION (main branch)
# Usage: ./deploy-prod.sh

set -e

PIKABOARD_DIR="/home/jndoye/.openclaw/workspace/pikaboard"

echo "🚀 Deploying PikaBoard PRODUCTION..."

cd "$PIKABOARD_DIR"

# Stash any local changes
git stash --include-untracked 2>/dev/null || true

# Fetch and checkout main
echo "📥 Fetching main branch..."
git fetch origin main
git checkout main
git pull origin main

# Build frontend
echo "🔧 Building frontend..."
cd frontend
npm install
VITE_BASE_PATH=/pikaboard/ npm run build

# Restart nginx to pick up any changes
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ PRODUCTION deployed successfully!"
echo "   URL: https://localhost/pikaboard/"
