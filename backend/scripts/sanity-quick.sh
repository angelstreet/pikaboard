#!/bin/bash
# sanity-quick.sh — Quick sanity check before marking tasks in_review
# Run time: <10 seconds
# Exit 0 = all good, Exit 1 = something broken

set -e

FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
API_URL="${API_URL:-http://127.0.0.1:3001/api}"
PASS=0
FAIL=0

echo "🔍 PikaBoard Sanity Check"
echo "========================="

# 1. Frontend loads (HTTP 200)
echo -n "1. Frontend ($FRONTEND_URL)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "304" ]; then
  echo "✅ HTTP $HTTP_CODE"
  PASS=$((PASS + 1))
else
  echo "❌ HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi

# 2. API responds (GET /api/tasks returns 200)
echo -n "2. API ($API_URL/tasks)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -H "Authorization: Bearer ${PIKABOARD_TOKEN:-41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d}" "$API_URL/tasks" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HTTP $HTTP_CODE"
  PASS=$((PASS + 1))
else
  echo "❌ HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi

# 3. API health - boards endpoint
echo -n "3. API ($API_URL/boards)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -H "Authorization: Bearer ${PIKABOARD_TOKEN:-41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d}" "$API_URL/boards" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HTTP $HTTP_CODE"
  PASS=$((PASS + 1))
else
  echo "❌ HTTP $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi

echo "========================="
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ SANITY CHECK FAILED — do NOT mark in_review"
  exit 1
else
  echo "✅ All checks passed — safe to proceed"
  exit 0
fi
