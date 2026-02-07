#!/bin/bash
# PikaBoard Deployment Verification
# Run after deploying to verify site works

set -e

# Configuration
ENV="${1:-dev}"
if [ "$ENV" == "dev" ]; then
    BASE_URL="https://127.0.0.1/pikaboard-dev"
elif [ "$ENV" == "prod" ]; then
    BASE_URL="https://127.0.0.1"
else
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

API_URL="https://127.0.0.1/api"
TOKEN="${PIKABOARD_TOKEN:-41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d}"

echo "🔍 PikaBoard Deploy Check ($ENV)"
echo "================================"
echo "URL: $BASE_URL"
echo ""

ERRORS=0

# 1. Page loads
echo "1. Page load..."
STATUS=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE_URL/")
if [ "$STATUS" == "200" ]; then
    echo "   ✅ Page: $STATUS"
else
    echo "   ❌ Page: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

# 2. Assets load
echo ""
echo "2. Assets..."

# Get asset filenames from index.html
JS_PATH=$(curl -sk "$BASE_URL/" | grep -oP 'src="[^"]+\.js"' | head -1 | grep -oP '"[^"]+"' | tr -d '"')
CSS_PATH=$(curl -sk "$BASE_URL/" | grep -oP 'href="[^"]+\.css"' | head -1 | grep -oP '"[^"]+"' | tr -d '"')

if [ -n "$JS_PATH" ]; then
    JS_STATUS=$(curl -sk -o /dev/null -w '%{http_code}' "https://127.0.0.1$JS_PATH")
    if [ "$JS_STATUS" == "200" ]; then
        echo "   ✅ JS: $JS_STATUS"
    else
        echo "   ❌ JS: $JS_STATUS (expected 200)"
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ -n "$CSS_PATH" ]; then
    CSS_STATUS=$(curl -sk -o /dev/null -w '%{http_code}' "https://127.0.0.1$CSS_PATH")
    if [ "$CSS_STATUS" == "200" ]; then
        echo "   ✅ CSS: $CSS_STATUS"
    else
        echo "   ❌ CSS: $CSS_STATUS (expected 200)"
        ERRORS=$((ERRORS + 1))
    fi
fi

# 3. API responds
echo ""
echo "3. API..."
API_STATUS=$(curl -sk -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$API_URL/tasks?limit=1")
if [ "$API_STATUS" == "200" ]; then
    echo "   ✅ API: $API_STATUS"
else
    echo "   ❌ API: $API_STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

# 4. Quick data check
echo ""
echo "4. Data..."
TASK_COUNT=$(curl -sk -H "Authorization: Bearer $TOKEN" "$API_URL/tasks" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('tasks',[])))" 2>/dev/null || echo "0")
echo "   ✅ Tasks in DB: $TASK_COUNT"

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ DEPLOY CHECK PASSED"
    exit 0
else
    echo "❌ DEPLOY CHECK FAILED ($ERRORS errors)"
    exit 1
fi
