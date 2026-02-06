#!/bin/bash
# Run E2E tests using Playwright

set -e

echo "🌐 PikaBoard E2E Tests"
echo "========================"
echo ""

# Check if running from CI or locally
if [ -z "$CI" ]; then
  echo "Running in local mode..."
  echo ""
fi

# Navigate to e2e directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check if Playwright browsers are installed
if [ ! -d "node_modules/.cache/ms-playwright" ] && [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "🎭 Installing Playwright browsers..."
  npx playwright install chromium
  echo ""
fi

# Run tests
echo "🧪 Running E2E tests..."
echo ""
npx playwright test --config=playwright.config.js "$@"

RESULT=$?

echo ""
echo "========================"
if [ $RESULT -eq 0 ]; then
  echo "✅ All E2E tests passed!"
else
  echo "❌ E2E tests failed!"
  echo ""
  echo "To view the report:"
  echo "  npx playwright show-report"
fi

exit $RESULT
