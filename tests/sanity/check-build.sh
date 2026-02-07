#!/bin/bash
# PikaBoard Non-Regression Sanity Check
# Run after every build before marking task done

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIST="$PROJECT_ROOT/frontend/dist"

echo "🔍 PikaBoard Sanity Check"
echo "========================="
echo ""

ERRORS=0

# 1. Check dist exists
echo "1. Build artifacts..."
if [ ! -d "$FRONTEND_DIST" ]; then
    echo "   ❌ FAIL: dist folder not found"
    echo "   Run: cd frontend && npm run build"
    exit 1
fi
echo "   ✅ dist folder exists"

# 2. Check index.html exists
if [ ! -f "$FRONTEND_DIST/index.html" ]; then
    echo "   ❌ FAIL: index.html not found"
    exit 1
fi
echo "   ✅ index.html exists"

# 3. Check base path in index.html
echo ""
echo "2. Base path check..."
BASE_PATH=$(grep -oP 'src="/[^/]+/' "$FRONTEND_DIST/index.html" | head -1 | grep -oP '/[^/]+/')

if [ -z "$BASE_PATH" ]; then
    echo "   ⚠️  WARN: Could not detect base path"
elif [ "$BASE_PATH" == "/pikaboard/" ]; then
    echo "   ✅ Base path: /pikaboard/ (production)"
elif [ "$BASE_PATH" == "/pikaboard-dev/" ]; then
    echo "   ✅ Base path: /pikaboard-dev/ (development)"
else
    echo "   ⚠️  WARN: Unexpected base path: $BASE_PATH"
fi

# 4. Check JS bundle exists
echo ""
echo "3. Asset bundles..."
JS_FILE=$(ls "$FRONTEND_DIST/assets/"*.js 2>/dev/null | head -1)
CSS_FILE=$(ls "$FRONTEND_DIST/assets/"*.css 2>/dev/null | head -1)

if [ -z "$JS_FILE" ]; then
    echo "   ❌ FAIL: No JS bundle found"
    ERRORS=$((ERRORS + 1))
else
    JS_SIZE=$(du -h "$JS_FILE" | cut -f1)
    echo "   ✅ JS bundle: $(basename $JS_FILE) ($JS_SIZE)"
fi

if [ -z "$CSS_FILE" ]; then
    echo "   ❌ FAIL: No CSS bundle found"
    ERRORS=$((ERRORS + 1))
else
    CSS_SIZE=$(du -h "$CSS_FILE" | cut -f1)
    echo "   ✅ CSS bundle: $(basename $CSS_FILE) ($CSS_SIZE)"
fi

# 5. Check for common build errors in JS
echo ""
echo "4. Build quality..."
if grep -q "localhost:3001" "$JS_FILE" 2>/dev/null; then
    echo "   ⚠️  WARN: Hardcoded localhost:3001 found in bundle"
fi

if grep -q "console.log" "$JS_FILE" 2>/dev/null; then
    echo "   ⚠️  WARN: console.log statements in production bundle"
fi
echo "   ✅ No critical issues"

# Summary
echo ""
echo "========================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ SANITY CHECK PASSED"
    exit 0
else
    echo "❌ SANITY CHECK FAILED ($ERRORS errors)"
    exit 1
fi
