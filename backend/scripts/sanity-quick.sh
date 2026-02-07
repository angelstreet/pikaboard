#!/bin/bash
# sanity-quick.sh — Quick sanity check before marking tasks in_review
# Run time: <10 seconds

set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:5173}"
API_URL="${API_URL:-http://127.0.0.1:3001/api}"
TOKEN="${TOKEN:-41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d}"
PASS=0
FAIL=0

check() {
  local label="$1" url="$2" expected="${3:-200}"
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$url" --max-time 5 2>/dev/null || echo "000")
  if [ "$status" = "$expected" ] || [ "$status" = "302" ]; then
    echo "✅ $label — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "❌ $label — HTTP $status (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 PikaBoard Sanity Check"
echo "========================="

check "Frontend loads" "$BASE_URL/pikaboard-dev/"
check "API /tasks" "$API_URL/tasks"
check "API /boards" "$API_URL/boards"

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "⛔ SANITY FAILED — do not mark in_review"
  exit 1
else
  echo "✅ All checks passed"
  exit 0
fi
