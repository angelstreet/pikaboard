#!/bin/bash
# E2E Test Runner for PikaBoard
set -e

cd "$(dirname "$0")"

echo "🧪 PikaBoard E2E Tests"
echo "======================"

# Check frontend is running
if ! curl -sf http://127.0.0.1:5173/pikaboard-dev/ > /dev/null 2>&1; then
  echo "❌ Frontend not running on port 5173"
  exit 1
fi

# Check API is running
if ! curl -sf -H "Authorization: Bearer 41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d" http://127.0.0.1:3001/api/tasks > /dev/null 2>&1; then
  echo "❌ API not running on port 3001"
  exit 1
fi

echo "✅ Frontend and API are running"
echo ""

# Run tests
npx playwright test --reporter=list "$@"
echo ""
echo "✅ E2E tests complete"
