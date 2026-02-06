#!/bin/bash
# Board API Tests
source "$(dirname "$0")/helpers.sh"

echo "📊 Testing Boards API"
echo "========================"

# GET /api/boards
echo ""
echo "GET /api/boards"
response=$(api GET "/boards")
assert_contains "Returns boards array" "$response" "boards"

# POST /api/boards (create)
echo ""
echo "POST /api/boards"
response=$(api POST "/boards" '{"name":"Test Board","icon":"🧪","color":"purple"}')
assert_contains "Returns created board" "$response" "id"
BOARD_ID=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -n "$BOARD_ID" ]; then
  # PATCH /api/boards/:id
  echo ""
  echo "PATCH /api/boards/$BOARD_ID"
  response=$(api PATCH "/boards/$BOARD_ID" '{"name":"Updated Test Board"}')
  assert_contains "Updates board" "$response" "Updated Test Board"
  
  # DELETE /api/boards/:id
  echo ""
  echo "DELETE /api/boards/$BOARD_ID"
  response=$(api DELETE "/boards/$BOARD_ID")
  assert_contains "Deletes board" "$response" "success"
fi

summary
