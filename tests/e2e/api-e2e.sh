#!/bin/bash
# PikaBoard E2E Tests — API-based end-to-end workflow tests
# Tests the full lifecycle: create board → create tasks → move through workflow → verify

set -e

API="http://127.0.0.1:3001/api"
TOKEN="41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
PASS=0
FAIL=0
ERRORS=""

# Helpers
pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); ERRORS="$ERRORS\n  ❌ $1"; echo "  ❌ $1"; }

api() { curl -s -H "$AUTH" -H "$CT" "$@"; }
api_status() { curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" -H "$CT" "$@"; }

echo "🧪 PikaBoard E2E Tests"
echo "========================"
echo ""

# ── Test 1: Health Check ──
echo "📋 Test 1: Health & Sanity"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/../health")
[ "$STATUS" = "200" ] && pass "Health endpoint returns 200" || fail "Health endpoint returned $STATUS"

STATUS=$(api_status "$API/tasks")
[ "$STATUS" = "200" ] && pass "Tasks API returns 200" || fail "Tasks API returned $STATUS"

STATUS=$(api_status "$API/boards")
[ "$STATUS" = "200" ] && pass "Boards API returns 200" || fail "Boards API returned $STATUS"

# ── Test 2: Board CRUD ──
echo ""
echo "📋 Test 2: Board CRUD"

# Create board
BOARD=$(api -X POST -d '{"name":"E2E Test Board","icon":"🧪","color":"purple"}' "$API/boards")
BOARD_ID=$(echo "$BOARD" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$BOARD_ID" ] && pass "Created board #$BOARD_ID" || fail "Failed to create board"

# Read board
BOARD_NAME=$(api "$API/boards/$BOARD_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
[ "$BOARD_NAME" = "E2E Test Board" ] && pass "Read board name matches" || fail "Board name mismatch: $BOARD_NAME"

# Update board
api -X PATCH -d '{"name":"E2E Updated Board"}' "$API/boards/$BOARD_ID" > /dev/null
BOARD_NAME=$(api "$API/boards/$BOARD_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
[ "$BOARD_NAME" = "E2E Updated Board" ] && pass "Updated board name" || fail "Board update failed"

# ── Test 3: Task CRUD ──
echo ""
echo "📋 Test 3: Task CRUD"

# Create task
TASK=$(api -X POST -d "{\"name\":\"E2E Test Task\",\"board_id\":$BOARD_ID,\"status\":\"inbox\",\"priority\":\"high\",\"tags\":[\"e2e\",\"test\"]}" "$API/tasks")
TASK_ID=$(echo "$TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$TASK_ID" ] && pass "Created task #$TASK_ID" || fail "Failed to create task"

# Read task
TASK_STATUS=$(api "$API/tasks/$TASK_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])" 2>/dev/null)
[ "$TASK_STATUS" = "inbox" ] && pass "Task status is inbox" || fail "Task status: $TASK_STATUS"

# Update task
api -X PATCH -d '{"name":"E2E Updated Task","description":"Updated description"}' "$API/tasks/$TASK_ID" > /dev/null
TASK_NAME=$(api "$API/tasks/$TASK_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
[ "$TASK_NAME" = "E2E Updated Task" ] && pass "Updated task name" || fail "Task update failed"

# ── Test 4: Task Workflow (Kanban Flow) ──
echo ""
echo "📋 Test 4: Task Workflow (inbox → up_next → in_progress → in_review → done)"

for STATUS in up_next in_progress in_review done; do
  api -X PATCH -d "{\"status\":\"$STATUS\"}" "$API/tasks/$TASK_ID" > /dev/null
  ACTUAL=$(api "$API/tasks/$TASK_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  [ "$ACTUAL" = "$STATUS" ] && pass "Moved to $STATUS" || fail "Expected $STATUS, got $ACTUAL"
done

# Verify completed_at is set when done
COMPLETED=$(api "$API/tasks/$TASK_ID" | python3 -c "import json,sys; d=json.load(sys.stdin); print('yes' if d.get('completed_at') else 'no')" 2>/dev/null)
[ "$COMPLETED" = "yes" ] && pass "completed_at set when done" || fail "completed_at not set"

# ── Test 5: Task Rating ──
echo ""
echo "📋 Test 5: Task Rating"
api -X PATCH -d '{"rating":5}' "$API/tasks/$TASK_ID" > /dev/null
RATING=$(api "$API/tasks/$TASK_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['rating'])" 2>/dev/null)
[ "$RATING" = "5" ] && pass "Rating set to 5" || fail "Rating: $RATING"

# ── Test 6: Task Filtering ──
echo ""
echo "📋 Test 6: Task Filtering"

# Create a second task for filtering
TASK2=$(api -X POST -d "{\"name\":\"E2E Filter Test\",\"board_id\":$BOARD_ID,\"status\":\"inbox\",\"priority\":\"low\"}" "$API/tasks")
TASK2_ID=$(echo "$TASK2" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)

COUNT=$(api "$API/tasks?board_id=$BOARD_ID&status=inbox" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['tasks']))" 2>/dev/null)
[ "$COUNT" -ge 1 ] && pass "Filter by board+status works ($COUNT tasks)" || fail "Filter returned $COUNT"

COUNT=$(api "$API/tasks?search=E2E" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['tasks']))" 2>/dev/null)
[ "$COUNT" -ge 2 ] && pass "Search by name works ($COUNT results)" || fail "Search returned $COUNT"

# ── Test 7: Inbox Workflow (prefix-based) ──
echo ""
echo "📋 Test 7: Inbox Workflow (task-based with prefixes)"

# Create approval task
APPROVAL=$(api -X POST -d "{\"name\":\"[APPROVAL] Deploy v2.0\",\"board_id\":$BOARD_ID,\"status\":\"inbox\",\"description\":\"**From:** bulbi\"}" "$API/tasks")
APPROVAL_ID=$(echo "$APPROVAL" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)
[ -n "$APPROVAL_ID" ] && pass "Created [APPROVAL] inbox task" || fail "Failed to create approval task"

# Accept it (simulate Jo approving by changing prefix)
api -X PATCH -d '{"name":"[APPROVED] Deploy v2.0"}' "$API/tasks/$APPROVAL_ID" > /dev/null
APPROVED_NAME=$(api "$API/tasks/$APPROVAL_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
[ "$APPROVED_NAME" = "[APPROVED] Deploy v2.0" ] && pass "Approval prefix updated to [APPROVED]" || fail "Prefix: $APPROVED_NAME"

# Create question task
QUESTION=$(api -X POST -d "{\"name\":\"[QUESTION] What manga style?\",\"board_id\":$BOARD_ID,\"status\":\"inbox\"}" "$API/tasks")
QUESTION_ID=$(echo "$QUESTION" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Answer it
api -X PATCH -d '{"name":"[ANSWERED] What manga style?","description":"**Answer:** Shonen style"}' "$API/tasks/$QUESTION_ID" > /dev/null
ANSWERED=$(api "$API/tasks/$QUESTION_ID" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)
[ "$ANSWERED" = "[ANSWERED] What manga style?" ] && pass "Question answered via prefix" || fail "Answer: $ANSWERED"

# ── Test 8: Goals API ──
echo ""
echo "📋 Test 8: Goals API"

STATUS=$(api_status "$API/goals")
[ "$STATUS" = "200" ] && pass "Goals list returns 200" || fail "Goals returned $STATUS"

STATUS=$(api_status "$API/goals/agent/bulbi")
[ "$STATUS" = "200" ] && pass "Agent goals endpoint returns 200" || fail "Agent goals returned $STATUS"

# ── Test 9: Archive/Restore ──
echo ""
echo "📋 Test 9: Archive & Restore"

api -X POST "$API/tasks/$TASK2_ID/archive" > /dev/null
ARCHIVED=$(api "$API/tasks/archived?board_id=$BOARD_ID" | python3 -c "import json,sys; tasks=json.load(sys.stdin)['tasks']; print(any(t['id']==$TASK2_ID for t in tasks))" 2>/dev/null)
[ "$ARCHIVED" = "True" ] && pass "Task archived" || fail "Archive failed"

api -X POST "$API/tasks/$TASK2_ID/restore" > /dev/null
pass "Task restored"

# ── Cleanup ──
echo ""
echo "📋 Cleanup"
for TID in $TASK_ID $TASK2_ID $APPROVAL_ID $QUESTION_ID; do
  api -X DELETE "$API/tasks/$TID" > /dev/null 2>&1
done
api -X DELETE "$API/boards/$BOARD_ID" > /dev/null 2>&1
pass "Cleaned up test data"

# ── Summary ──
echo ""
echo "========================"
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo -e "\nFailures:$ERRORS"
  exit 1
else
  echo "🎉 All E2E tests passed!"
  exit 0
fi
