#!/bin/bash
# Build PikaBoard frontend for dev environment
# Outputs to dist-dev/ with /pikaboard-dev/ base path

set -e

cd "$(dirname "$0")/../frontend"

echo "🔧 Building PikaBoard DEV frontend..."
VITE_BASE_PATH=/pikaboard-dev/ npm run build

# Move build to dist-dev
rm -rf dist-dev
mv dist dist-dev

echo "✅ Dev build complete: frontend/dist-dev/"
