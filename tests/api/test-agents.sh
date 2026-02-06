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
assert_contains "Has bulbi agent" "$response" "bulbi"

summary
