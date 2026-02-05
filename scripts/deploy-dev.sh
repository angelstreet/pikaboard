#!/bin/bash
# Deploy PikaBoard DEVELOPMENT (dev branch)
# Usage: ./deploy-dev.sh

set -e

PIKABOARD_DIR="/home/jndoye/.openclaw/workspace/pikaboard"

echo "🚀 Deploying PikaBoard DEVELOPMENT..."

cd "$PIKABOARD_DIR"

# Stash any local changes
git stash --include-untracked 2>/dev/null || true

# Fetch and checkout dev
echo "📥 Fetching dev branch..."
git fetch origin dev
git checkout dev
git pull origin dev

# Build frontend to dist-dev
echo "🔧 Building frontend..."
cd frontend
npm install
VITE_BASE_PATH=/pikaboard-dev/ npm run build

# Move to dist-dev
rm -rf dist-dev
mv dist dist-dev

# Restart nginx to pick up any changes
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ DEVELOPMENT deployed successfully!"
echo "   URL: https://localhost/pikaboard-dev/"
