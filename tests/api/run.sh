#!/bin/bash
# Run all API tests

echo "🧪 PikaBoard API Tests"
echo "========================"
echo ""

TESTS_DIR="$(dirname "$0")"
TOTAL_PASS=0
TOTAL_FAIL=0

for test in "$TESTS_DIR"/test-*.sh; do
  echo "Running: $(basename "$test")"
  echo "---"
  bash "$test"
  echo ""
done

echo "========================"
echo "All API tests complete!"
