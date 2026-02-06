#!/bin/bash
# Pre-review check script - MUST pass before moving task to in_review
# Usage: ./scripts/pre-review-check.sh

set -e

echo "🔍 Pre-Review Checklist"
echo "========================"
echo ""
echo "This script must pass before moving any task to in_review"
echo ""

FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_step() {
  local name="$1"
  local command="$2"
  
  echo "⏳ Checking: $name..."
  if eval "$command" > /tmp/check-output.txt 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    return 0
  else
    echo -e "${RED}✗${NC} $name"
    echo "   Output: $(cat /tmp/check-output.txt | head -1)"
    return 1
  fi
}

# 1. Git status check
echo "📋 Step 1: Git Status"
echo "------------------------"
if check_step "On dev branch" "git branch --show-current | grep -q '^dev$'"; then
  :
else
  echo -e "${YELLOW}⚠${NC} Not on dev branch - switch with: git checkout dev"
  FAILED=$((FAILED + 1))
fi

if check_step "No uncommitted changes" "git diff --quiet HEAD"; then
  :
else
  echo -e "${YELLOW}⚠${NC} Uncommitted changes present - commit before review"
  FAILED=$((FAILED + 1))
fi

if check_step "Changes pushed to remote" "git diff --quiet HEAD origin/dev --"; then
  :
else
  echo -e "${YELLOW}⚠${NC} Unpushed commits - push with: git push origin dev"
  FAILED=$((FAILED + 1))
fi

echo ""

# 2. Build check
echo "🔨 Step 2: Build Verification"
echo "------------------------"
cd "$(git rev-parse --show-toplevel)"

if check_step "Backend builds" "cd backend && npm run build"; then
  :
else
  FAILED=$((FAILED + 1))
fi

if check_step "Frontend builds" "cd frontend && npm run build"; then
  :
else
  FAILED=$((FAILED + 1))
fi

echo ""

# 3. Test check
echo "🧪 Step 3: Test Verification"
echo "------------------------"

if check_step "Unit tests pass" "cd backend && npm run test"; then
  :
else
  FAILED=$((FAILED + 1))
fi

if check_step "API tests pass" "bash tests/api/run.sh"; then
  :
else
  FAILED=$((FAILED + 1))
fi

echo ""

# 4. Lint check
echo "📝 Step 4: Code Quality"
echo "------------------------"

if check_step "Backend linting" "cd backend && npm run lint"; then
  :
else
  echo -e "${YELLOW}⚠${NC} Run: cd backend && npm run format"
  FAILED=$((FAILED + 1))
fi

if check_step "Frontend linting" "cd frontend && npm run lint"; then
  :
else
  echo -e "${YELLOW}⚠${NC} Run: cd frontend && npm run format"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "========================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "You can now move the task to in_review."
  echo "Include these test results in your comment."
  exit 0
else
  echo -e "${RED}❌ $FAILED check(s) failed${NC}"
  echo ""
  echo "Fix the issues above before moving to in_review."
  exit 1
fi
