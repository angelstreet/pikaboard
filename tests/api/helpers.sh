#!/bin/bash
# API Test Helpers

API_BASE="http://localhost:3001/api"
TOKEN="${PIKABOARD_TOKEN:-41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -n "$data" ]; then
    curl -s -X "$method" "${API_BASE}${endpoint}" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "${API_BASE}${endpoint}" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

assert_status() {
  local name=$1
  local expected=$2
  local actual=$3
  
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $name (expected $expected, got $actual)"
    ((FAIL++))
  fi
}

assert_json() {
  local name=$1
  local json=$2
  local jq_filter=$3
  local expected=$4
  
  # Use python since jq not installed
  local actual=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d$jq_filter'))" 2>/dev/null)
  
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $name (expected $expected, got $actual)"
    ((FAIL++))
  fi
}

assert_contains() {
  local name=$1
  local json=$2
  local key=$3
  
  if echo "$json" | grep -q "\"$key\""; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $name (missing key: $key)"
    ((FAIL++))
  fi
}

summary() {
  echo ""
  echo "========================"
  echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  if [ $FAIL -gt 0 ]; then
    exit 1
  fi
}
