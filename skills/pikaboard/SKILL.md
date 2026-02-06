---
name: pikaboard
description: Interact with PikaBoard task management API. Use when creating, updating, listing, or managing tasks. Agent-first task management.
---

# PikaBoard API

PikaBoard is an agent-first task/kanban dashboard.

## Source of Truth

**PikaBoard is the source of truth for tasks.** Query the API, not local files.

## Task Commands

Users reference tasks by ID:
- `task 12` or `t12` → task ID 12
- `delete task 12` → delete
- `move task 12 to done` → status change
- `list tasks` → show all

When listing tasks, show: `#ID name (status)`

## Configuration

See TOOLS.md for:
- **API:** Local URL
- **Token:** Bearer token

## Authentication

All requests require:
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Enums

**status:** `inbox` | `up_next` | `in_progress` | `in_review` | `done`

**priority:** `low` | `medium` | `high` | `urgent`

## Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (filters: `status`, `priority`) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task |
| PATCH | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

### Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/activity | List recent activity |

### Crons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/crons | List OpenClaw cron jobs |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/skills | List installed skills |

## Task Fields

```json
{
  "name": "required string",
  "description": "optional string",
  "status": "inbox|up_next|in_progress|in_review|done",
  "priority": "low|medium|high|urgent",
  "tags": ["array", "of", "strings"]
}
```

## Examples

### Create task
```bash
curl -X POST $PIKABOARD_API/api/tasks \
  -H "Authorization: Bearer $PIKABOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fix bug","status":"inbox","priority":"high"}'
```

### List tasks by status
```bash
curl "$PIKABOARD_API/api/tasks?status=up_next" \
  -H "Authorization: Bearer $PIKABOARD_TOKEN"
```

### Update task status
```bash
curl -X PATCH $PIKABOARD_API/api/tasks/123 \
  -H "Authorization: Bearer $PIKABOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

## Web UI

Access the dashboard at the configured URL (see TOOLS.md).

- **Dashboard:** Kanban board view
- **Routines:** Cron job schedules
- **Skills:** Installed skills library
