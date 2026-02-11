# PikaBoard Backend API

Base URL (local): `http://localhost:3001`

API prefix: `/api`

## Authentication

All `/api/*` routes are protected by bearer auth **if** `PIKABOARD_API_TOKEN` is set in the backend environment.

- Header: `Authorization: Bearer <PIKABOARD_API_TOKEN>`
- Legacy fallback: `PIKABOARD_TOKEN` is still accepted for backward compatibility.
- If neither token variable is set, auth is effectively disabled (middleware allows requests through).

`/health` is always public.

## Conventions

- Request bodies are JSON for `POST`/`PATCH` routes (`Content-Type: application/json`).
- Errors are typically returned as JSON: `{ "error": "..." }` with HTTP `4xx/5xx`.
- Many list endpoints wrap results (example: `{ "tasks": [...] }`).
- Timestamps are returned as SQLite datetime strings (from `CURRENT_TIMESTAMP`) or ISO strings (some computed fields).

## Health

### `GET /health`
Public liveness check.

Response:
```json
{ "status": "ok", "timestamp": "2026-02-07T12:34:56.789Z" }
```

## Tasks

Task statuses (validated by backend):
`inbox`, `up_next`, `in_progress`, `testing`, `in_review`, `done`, `rejected`

Task priorities (validated by backend):
`low`, `medium`, `high`, `urgent`

### `GET /api/tasks`
Query params (all optional):
- `status`
- `priority`
- `board_id` (number)
- `search` (matches `name` or `description`)
- `tag` (matches a single tag in the stored JSON array)

Response:
```json
{
  "tasks": [
    {
      "id": 1,
      "name": "Task name",
      "description": null,
      "status": "inbox",
      "priority": "medium",
      "tags": ["tag1", "tag2"],
      "board_id": 1,
      "board_name": "Main",
      "position": 0,
      "deadline": null,
      "created_at": "2026-02-06 10:00:00",
      "updated_at": "2026-02-06 10:00:00",
      "completed_at": null,
      "rating": null,
      "rated_at": null,
      "rejection_reason": null
    }
  ]
}
```

### `GET /api/tasks/:id`
Response: a single task object (same fields as above, including `tags` as an array).

### `POST /api/tasks`
Body:
```json
{
  "name": "Task name (required)",
  "description": "Optional",
  "status": "inbox",
  "priority": "medium",
  "tags": ["comma", "not", "required"],
  "board_id": 1,
  "position": 0,
  "deadline": "2026-02-10"
}
```

Notes:
- `name` is required.
- If `board_id` is omitted, the task is created on the first board by position.
- If `position` is omitted, the backend appends to the end of the column for `board_id` + `status`.

### `PATCH /api/tasks/:id`
Body (all fields optional):
```json
{
  "name": "New name",
  "description": "Updated details",
  "status": "done",
  "priority": "high",
  "tags": ["a", "b"],
  "board_id": 2,
  "position": 3,
  "deadline": "2026-02-10",
  "rating": 5,
  "rejection_reason": "Why it was rejected"
}
```

Notes:
- `rating` must be an integer `1..5` or `null`. When set to a number, `rated_at` is set.
- When status transitions to `done`, `completed_at` is set. When transitioning away from `done`, `completed_at` is cleared.

### `DELETE /api/tasks/:id`
Response:
```json
{ "success": true }
```

## Boards

### `GET /api/boards`
Response:
```json
{ "boards": [ { "id": 1, "name": "Main", "icon": "📋", "color": "blue", "position": 0, "show_testing": 0 } ] }
```

### `POST /api/boards`
Body:
```json
{ "name": "Board name", "icon": "📋", "color": "blue", "position": 0 }
```

Notes:
- `name` is required.
- Defaults: `icon="📋"`, `color="blue"`, `position=max(position)+1`.

### `GET /api/boards/:id`
Response: board object.

### `PATCH /api/boards/:id`
Body (all fields optional):
```json
{ "name": "New name", "icon": "🧪", "color": "green", "position": 2, "show_testing": true }
```

### `DELETE /api/boards/:id`
Query params:
- `deleteTasks=true|false` (default `false`)

Notes:
- You cannot delete the last board.
- If `deleteTasks=false`, tasks are moved to the first available board.

Response:
```json
{ "success": true }
```

### `GET /api/boards/:id/tasks`
Query params (optional): `status`

Response:
```json
{ "tasks": [ /* tasks with tags parsed */ ], "board": { /* board */ } }
```

## Activity

### `GET /api/activity`
Query params (optional):
- `limit` (default `50`)
- `offset` (default `0`)
- `type`

Response:
```json
{ "activity": [ { "id": 1, "type": "task_updated", "message": "...", "metadata": {}, "created_at": "..." } ] }
```

### `POST /api/activity`
Body:
```json
{ "type": "custom_event", "message": "Something happened", "metadata": { "any": "json" } }
```
Response: `{ "success": true }` (201)

## Goals

Goal types: `global`, `agent`

Goal statuses: `active`, `paused`, `achieved`

### `GET /api/goals`
Query params (all optional):
- `type`
- `agent_id`
- `board_id`
- `status`

Response:
```json
{ "goals": [ { "id": 1, "title": "Goal", "task_count": 2, "done_count": 1 } ] }
```

### `POST /api/goals`
Body:
```json
{ "title": "Goal title (required)", "description": "Optional", "type": "global", "agent_id": null, "status": "active", "deadline": null, "board_id": 1 }
```
Response: goal object (includes `tasks`, `task_count`, `done_count`) (201)

### `GET /api/goals/:id`
Response: goal object (includes `tasks`, `task_count`, `done_count`)

### `PATCH /api/goals/:id`
Body: any of `title`, `description`, `type`, `agent_id`, `status`, `progress`, `deadline`, `board_id`

Response: updated goal object (includes `tasks`, `task_count`, `done_count`)

### `DELETE /api/goals/:id`
Response: `{ "success": true }`

### `POST /api/goals/:id/tasks/:taskId`
Links a task to a goal.

Response: updated goal object (201)

### `DELETE /api/goals/:id/tasks/:taskId`
Unlinks a task from a goal.

Response: updated goal object

### `GET /api/goals/:id/tasks`
Response:
```json
{ "tasks": [ /* raw task rows */ ], "goal": { /* goal row */ } }
```

## Questions (Inbox / Approvals)

Question statuses: `pending`, `answered`, `approved`, `rejected`

Question types: `question`, `approval`

### `GET /api/questions`
Query params (optional):
- `status` (only the values above are accepted)
- `type` (only `question|approval` accepted)
- `limit` (default `50`)

Response:
```json
{ "questions": [ { "id": 1, "agent": "bulbi", "type": "question", "status": "pending", "question": "...", "answer": null } ] }
```

### `GET /api/questions/:id`
Response: question row.

### `POST /api/questions`
Body:
```json
{ "agent": "bulbi", "type": "question", "question": "Do we ...?", "context": "Optional context" }
```
Response: `{ "success": true, "question": { ... }, "message": "..." }` (201)

### `PATCH /api/questions/:id`
Body: at least one of:
- `answer` (also sets `status=answered` + `answered_at`)
- `type` (`question|approval`)
- `question` (updates text)

Response: `{ "success": true, "question": { ... }, "message": "Question answered" }`

### `POST /api/questions/:id/approve`
Body: `{ "comment": "Optional" }`

Requires the item `type` to be `approval`.

### `POST /api/questions/:id/reject`
Body: `{ "comment": "Optional" }`

Requires the item `type` to be `approval`.

### `DELETE /api/questions/:id`
Response: `{ "success": true, "message": "Question deleted" }`

## Proposals (Pending Proposals File)

### `GET /api/proposals`
Response:
```json
{
  "proposals": [ { "agentId": "bulbi", "items": [ { "name": "Do X", "description": "Optional" } ] } ],
  "updatedAt": "2026-02-07T12:34:56.789Z"
}
```

### `POST /api/proposals/:agentId`
Submit proposals (intended for agents).

Body:
```json
{ "items": [ "Proposal 1", { "name": "Proposal 2", "description": "..." } ] }
```

Notes:
- Max 5 proposals are stored.

### `POST /api/proposals/:agentId/approve`
Approves one proposal by index and creates a task (status `up_next`, priority `medium`).

Body:
```json
{ "index": 0, "boardId": 1, "comment": "Optional note appended to description" }
```

Response includes `{ "task": { ... } }`.

### `POST /api/proposals/:agentId/reject`
Rejects one proposal by index, or all proposals.

Body:
```json
{ "index": 0, "comment": "Optional" }
```
Or:
```json
{ "all": true, "comment": "Optional" }
```

## Agents

### `GET /api/agents`
Lists agents by reading `~/.openclaw/agents/*` and augmenting with task/subagent info.

Response:
```json
{ "agents": [ { "id": "bulbi", "status": "busy", "boardId": 6, "activeSubAgents": 1 } ] }
```

### `GET /api/agents/:id`
Response:
```json
{ "agent": { /* agent object */ }, "soulMd": "full SOUL.md content (string)" }
```

### `GET /api/agents/:id/stats`
Response includes token and session aggregates parsed from gateway logs / runs:
```json
{ "agentId": "bulbi", "tokens": { "total": 0, "input": 0, "output": 0 }, "sessions": { "count": 0 } }
```

### `GET /api/agents/:id/logs`
Query params (optional):
- `lines` (default `100`)

Response:
```json
{ "agentId": "bulbi", "logs": [ { "timestamp": "...", "summary": "...", "type": "message" } ], "count": 42 }
```

## Files (Whitelisted Read-Only Explorer)

### `GET /api/files`
Query params (optional):
- `path` (default `~/.openclaw/workspace/research`)

Notes:
- Relative `path` values are resolved under `~/.openclaw/workspace`.
- Paths are restricted to a whitelist of OpenClaw workspace/agent directories.

### `GET /api/files/content`
Query params:
- `path` (required)

Notes:
- File size is limited to 1MB.

### `GET /api/files/roots`
Lists available root directories for browsing.

## System

### `GET /api/system/health`
Proc-based health endpoint.

Response includes:
- `status`: `healthy|warning|critical`
- `alerts`: optional list of strings
- `cpu`, `memory`, `disk`, `uptime`, `hostname`, `platform`, `timestamp`

### `GET /api/system`
Legacy system stats endpoint (includes gateway status).

### `GET /api/system/session-context`
Returns OpenClaw session context token usage for the main session (best-effort).

## Config

### `GET /api/config`
Read-only configuration snapshot (workspace path, gateway URL, masked token, environment info).

## Skills

### `GET /api/skills`
Lists installed skills under `OPENCLAW_SKILLS_PATH`.

### `GET /api/skills/:name`
Returns skill details and may include `skillMd`/`readme` contents.

## Library

### `GET /api/library/agents`
Lists agent configs (`config.json`) found under `OPENCLAW_AGENTS_PATH`.

### `GET /api/library/skills`
Lists skills and which agents use them.

### `GET /api/library/plugins`
Lists known channel plugins and which agents use them (sanitized config only).

## Stats

### `GET /api/stats`
Dashboard summary counts (weekly completions, totals, focus list).

## Insights

### `GET /api/insights`
Analytics snapshot (completions over time, distributions, activity trends, agent stats).

## Usage

### `GET /api/usage`
Query params (optional):
- `period`: `day|week|month|year|all` (default `all`)

Returns aggregated token/cost stats and pricing metadata.

### `GET /api/usage/summary`
Lightweight summary for header UI.

Response:
```json
{
  "daily": { "anthropic": 0, "kimi": 0, "total": 0 },
  "monthly": { "anthropic": 0, "kimi": 0, "total": 0 },
  "updatedAt": "2026-02-07T12:34:56.789Z"
}
```
