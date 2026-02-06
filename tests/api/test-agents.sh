#!/bin/bash
# Agents API Tests
source "$(dirname "$0")/helpers.sh"

echo "🤖 Testing Agents API"
echo "========================"

# GET /api/agents
echo ""
echo "GET /api/agents"
response=$(api GET "/agents")
assert_contains "Returns agents array" "$response" "agents"

# Check known agents exist
echo ""
echo "Checking known agents"
if echo "$response" | grep -q "bulbi"; then
  echo -e "${GREEN}✓${NC} Bulbi agent exists"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Bulbi agent missing"
  ((FAIL++))
fi

summary
