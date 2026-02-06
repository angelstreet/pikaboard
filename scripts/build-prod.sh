#!/bin/bash
# Build PikaBoard frontend for production environment
# Outputs to dist/ with /pikaboard/ base path

set -e

cd "$(dirname "$0")/../frontend"

echo "🔧 Building PikaBoard PROD frontend..."
VITE_BASE_PATH=/pikaboard/ npm run build

echo "✅ Prod build complete: frontend/dist/"
