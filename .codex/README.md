# PikaBoard Codex Context

This file is a **bootstrap context** for assistants. It documents where to find URLs, tokens, and how to check health/status **without storing secrets** in git.

## Environments

### Local (dev)
- UI base URL: `<FILL>`
- API base URL: `<FILL>`
- API health endpoint: `<FILL>`
- System health endpoint: `<FILL>`
- Auth token location: `backend/.env` (do not commit the value)
- DB path: `<FILL>` (default is `./data/pikaboard.db`)

### Dev (server)
- UI base URL: `<FILL>`
- API base URL: `<FILL>`
- API health endpoint: `<FILL>`
- System health endpoint: `<FILL>`
- Auth token location: `<FILL>` (path or secret manager)

### Prod (server)
- UI base URL: `<FILL>`
- API base URL: `<FILL>`
- API health endpoint: `<FILL>`
- System health endpoint: `<FILL>`
- Auth token location: `<FILL>` (path or secret manager)

## Nginx / Reverse Proxy
- Nginx config path(s): `<FILL>`
- UI path prefix (if any): `<FILL>`
- API path prefix (if any): `<FILL>`
- Auth handled at proxy?: `<YES/NO>`

## OpenClaw
- OpenClaw workspace: `<FILL>`
- Agents path: `<FILL>` (default `~/.openclaw/agents`)
- Skills path: `<FILL>` (default `~/.openclaw/workspace/skills`)
- PikaBoard token for OpenClaw → API: `<FILL>` (location only)

## Health/Status Checks

### Backend
- Check backend health:
  - `curl -s <API_BASE>/health`
- Check system health:
  - `curl -s <API_BASE>/api/system/health`

### Frontend
- Check UI reachable:
  - `curl -I <UI_BASE>`

### PikaBoard data
- List tasks:
  - `curl -s -H "Authorization: Bearer <TOKEN>" <API_BASE>/api/tasks`
- List boards:
  - `curl -s -H "Authorization: Bearer <TOKEN>" <API_BASE>/api/boards`
- Inbox (questions/approvals):
  - `curl -s -H "Authorization: Bearer <TOKEN>" <API_BASE>/api/questions?status=pending`

### OpenClaw agent status
- Agent heartbeat/status endpoint (if any): `<FILL>`
- How to check from filesystem/logs: `<FILL>`

## Local Commands (repo)

### Backend
- Start dev server:
  - `cd backend && npm run dev`
- Run tests:
  - `cd backend && npm test`

### Frontend
- Start dev server:
  - `cd frontend && npm run dev`
- Build:
  - `cd frontend && npm run build`

### Full checks (pre-review)
- `./scripts/pre-review-check.sh`

## Notes
- Do **not** put secrets in this file.
- If you need to share tokens with an assistant, provide them out-of-band or point to the secret location.
