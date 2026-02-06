#!/bin/bash
# Run all API tests

echo "🧪 PikaBoard API Tests"
echo "========================"
echo ""

FAILED=0

for test in $(dirname "$0")/test-*.sh; do
  echo ""
  bash "$test"
  if [ $? -ne 0 ]; then
    FAILED=1
  fi
  echo ""
done

echo "========================"
if [ $FAILED -eq 0 ]; then
  echo "✅ All API tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
