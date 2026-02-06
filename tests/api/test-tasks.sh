#!/bin/bash
# Task API Tests
source "$(dirname "$0")/helpers.sh"

echo "📋 Testing Tasks API"
echo "========================"

# GET /api/tasks
echo ""
echo "GET /api/tasks"
response=$(api GET "/tasks")
assert_contains "Returns tasks array" "$response" "tasks"

# GET /api/tasks with board filter
echo ""
echo "GET /api/tasks?board_id=1"
response=$(api GET "/tasks?board_id=1")
assert_contains "Returns filtered tasks" "$response" "tasks"

# POST /api/tasks (create)
echo ""
echo "POST /api/tasks"
response=$(api POST "/tasks" '{"name":"Test Task","board_id":1,"status":"inbox","priority":"medium"}')
assert_contains "Returns created task" "$response" "id"
TASK_ID=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# GET /api/tasks/:id
if [ -n "$TASK_ID" ]; then
  echo ""
  echo "GET /api/tasks/$TASK_ID"
  response=$(api GET "/tasks/$TASK_ID")
  assert_contains "Returns task by ID" "$response" "name"
  
  # PATCH /api/tasks/:id
  echo ""
  echo "PATCH /api/tasks/$TASK_ID"
  response=$(api PATCH "/tasks/$TASK_ID" '{"status":"up_next"}')
  assert_contains "Updates task status" "$response" "up_next"
  
  # DELETE /api/tasks/:id
  echo ""
  echo "DELETE /api/tasks/$TASK_ID"
  response=$(api DELETE "/tasks/$TASK_ID")
  assert_contains "Deletes task" "$response" "success"
fi

summary
