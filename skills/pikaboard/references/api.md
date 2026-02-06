# PikaBoard API Reference

Base URL: `http://localhost:3001/api` (or as configured)

All requests require:
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Tasks

### List Tasks
```
GET /tasks
GET /tasks?status=up_next
GET /tasks?board_id=6
GET /tasks?priority=high
```

Response:
```json
[
  {
    "id": 1,
    "name": "Task name",
    "description": "Details...",
    "status": "inbox",
    "priority": "medium",
    "tags": "tag1,tag2",
    "board_id": 1,
    "position": 0,
    "created_at": "2026-02-06 10:00:00",
    "updated_at": "2026-02-06 10:00:00",
    "completed_at": null,
    "deadline": null,
    "rating": null,
    "rated_at": null
  }
]
```

### Get Task
```
GET /tasks/:id
```

### Create Task
```
POST /tasks
```

Body:
```json
{
  "name": "Task name (required)",
  "description": "Optional details",
  "status": "inbox",
  "priority": "medium",
  "tags": "comma,separated",
  "board_id": 1,
  "deadline": "2026-02-10"
}
```

### Update Task
```
PATCH /tasks/:id
```

Body (all fields optional):
```json
{
  "name": "New name",
  "status": "done",
  "priority": "high",
  "description": "Updated details"
}
```

### Delete Task
```
DELETE /tasks/:id
```

## Boards

### List Boards
```
GET /boards
```

### Get Board
```
GET /boards/:id
```

### Create Board
```
POST /boards
```

Body:
```json
{
  "name": "Board name",
  "description": "Optional"
}
```

## Activity

### List Activity
```
GET /activity
GET /activity?limit=50
```

Returns recent task changes and agent actions.

## Crons

### List Cron Jobs
```
GET /crons
```

Returns OpenClaw scheduled jobs.

## Skills

### List Skills
```
GET /skills
```

Returns installed OpenClaw skills.

## Usage

### Get Token Usage
```
GET /usage
```

Returns token/cost data from OpenClaw sessions:
```json
{
  "today": {
    "total": 15.50,
    "tokens": 500000,
    "byModel": {"opus": 15.00, "kimi": 0.50}
  },
  "thisWeek": {...},
  "thisMonth": {...},
  "byModel": {...},
  "savings": {"amount": 50.00, "percentage": 75.0}
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not found |
| 500 | Server error |

## Pagination

For large result sets, use:
```
GET /tasks?limit=50&offset=100
```
