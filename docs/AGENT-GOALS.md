# Agent Goals Integration

## Overview
Agents check goals during heartbeats to drive autonomous task creation. Goals provide strategic direction ("WHY") while tasks are tactical ("HOW").

## Heartbeat Flow

### 1. Check assigned goals
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:3001/api/goals/agent/{agentId}"
```

Response includes:
- `goals[]` — active goals (agent-specific + global)
- `goals[].needs_tasks` — true if goal has no pending tasks and isn't complete
- `goals[].pending_tasks` — tasks still in progress toward this goal
- `summary.needs_tasks` — count of goals needing new tasks

### 2. Decision tree
```
For each goal where needs_tasks = true:
  → Propose 1-3 tasks that advance this goal
  → Create task in inbox with link to goal

For goals with pending_tasks:
  → Pick highest priority pending task to work on
  → Prioritize tasks linked to goals over unlinked tasks
```

### 3. Create goal-linked task
```bash
# Step 1: Create task
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Add README badges","status":"inbox","board_id":6,"priority":"medium"}' \
  "http://127.0.0.1:3001/api/tasks"

# Step 2: Link to goal
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:3001/api/goals/{goalId}/tasks/{taskId}"
```

### 4. Propose tasks (inbox pattern)
```bash
# Create as inbox task with [APPROVAL] prefix for Jo's review
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"[APPROVAL] Add README badges (Goal: PikaBoard v1.0)",
    "description":"**From:** bulbi\n**Goal:** PikaBoard ready for open-source\n**Rationale:** README badges improve discoverability and show project health.\n\nProposed tasks:\n1. Add CI badge\n2. Add license badge\n3. Add version badge",
    "status":"inbox",
    "board_id":6,
    "priority":"medium"
  }' \
  "http://127.0.0.1:3001/api/tasks"
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/goals/agent/:agentId` | GET | Goals for agent (active only) |
| `/api/goals` | GET | All goals (filter: ?type=&agent_id=&status=) |
| `/api/goals/:id` | GET | Single goal with linked tasks |
| `/api/goals/:id/tasks/:taskId` | POST | Link task to goal |
| `/api/goals/:id/tasks/:taskId` | DELETE | Unlink task from goal |

## Goal Types
- **global** — applies to all agents (e.g., "Ship PikaBoard v1.0")
- **agent** — specific to one agent (e.g., "Improve test coverage" for Bulbi)

## Progress
Progress auto-calculates from linked tasks: `done / total * 100`. Completing a task automatically updates all linked goals.

## Example Agent Heartbeat
```
1. GET /api/goals/agent/bulbi
2. See: "PikaBoard v1.0" needs_tasks=true (0 pending)
3. Think: What advances this goal?
4. POST /api/tasks → [APPROVAL] Add CONTRIBUTING.md
5. POST /api/goals/1/tasks/283 → link to goal
6. Continue with existing up_next tasks
```
