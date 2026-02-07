# PikaBoard Codex Context

This file is a **bootstrap context** for assistants. It documents where to find URLs, tokens, and how to check health/status **without storing secrets** in git.

## Environments

### Local (dev)
- UI base URL: `http://localhost:5173/pikaboard-dev/`
- API base URL: `http://localhost:3001/api`
- API health endpoint: `http://localhost:3001/health`
- System health endpoint: `http://localhost:3001/api/system/health`
- Auth token location: `backend/.env` (do not commit the value)
- DB path: `backend/pikaboard.db`

### Dev (server)
- UI base URL: `https://65.108.14.251:8080/pikaboard-dev/`
- API base URL: `http://127.0.0.1:3001/api` (internal) or `https://65.108.14.251:8080/api` (external via nginx)
- API health endpoint: `/health`
- System health endpoint: `/api/system/health`
- Auth token location: `~/.openclaw/workspace/shared/projects/pikaboard/backend/.env`

### Prod (server)
- UI base URL: `https://65.108.14.251:8080/pikaboard/`
- API base URL: `https://65.108.14.251:8080/api`
- API health endpoint: `/health`
- System health endpoint: `/api/system/health`
- Auth token location: `~/.openclaw/workspace/shared/projects/pikaboard/backend/.env`

## Nginx / Reverse Proxy
- Nginx config path(s): `/etc/nginx/sites-enabled/openclaw`
- UI path prefix (if any): `/pikaboard/` (prod), `/pikaboard-dev/` (dev)
- API path prefix (if any): `/api/` (proxied to backend:3001)
- Auth handled at proxy?: NO (handled by backend middleware)

## OpenClaw
- OpenClaw workspace: `~/.openclaw/workspace`
- Agents path: `~/.openclaw/agents`
- Skills path: `~/.openclaw/workspace/skills` (symlink to shared/skills)
- PikaBoard token for OpenClaw → API: `backend/.env` (variable: `PIKABOARD_TOKEN`)

## Health/Status Checks

### Backend
- Check backend health:
  - `curl -s http://127.0.0.1:3001/health`
- Check system health:
  - `curl -s http://127.0.0.1:3001/api/system/health`

### Frontend
- Check UI reachable:
  - `curl -I http://localhost:5173/pikaboard-dev/`

### PikaBoard data
- List tasks:
  - `curl -s -H "Authorization: Bearer $PIKABOARD_TOKEN" http://127.0.0.1:3001/api/tasks`
- List boards:
  - `curl -s -H "Authorization: Bearer $PIKABOARD_TOKEN" http://127.0.0.1:3001/api/boards`
- Inbox (blockers + questions/approvals):
  - Blockers (agent proposals): `curl -s -H "Authorization: Bearer $PIKABOARD_TOKEN" http://127.0.0.1:3001/api/proposals`
  - Questions/approvals: `curl -s -H "Authorization: Bearer $PIKABOARD_TOKEN" http://127.0.0.1:3001/api/questions?status=pending`

## UI Navigation Notes
- `/boards`: Kanban board only (no Focus/Blockers tabs).
- `/inbox`: includes Blockers (agent proposals) plus pending approvals and questions.
- `/`: Dashboard includes the Focus List summary.

### OpenClaw agent status
- Agent heartbeat/status endpoint: `http://127.0.0.1:18789/openclaw/api/status`
- How to check from filesystem/logs: `pm2 logs openclaw` or `~/.openclaw/logs/`

## Local Commands (repo)

### Backend
- Start dev server:
  - `cd backend && npm run dev`
- Run tests:
  - `cd backend && npm test`
- PM2 management:
  - `pm2 restart pikaboard-backend`
  - `pm2 logs pikaboard-backend`

### Frontend
- Start dev server:
  - `cd frontend && npm run dev`
- Build (prod only, not for dev branch):
  - `cd frontend && VITE_BASE_PATH=/pikaboard/ npm run build`

### Full checks (pre-review)
- Type check: `cd frontend && npx tsc --noEmit`
- API smoke test: `curl -s http://127.0.0.1:3001/api/tasks | head`
- Screenshot: `node /tmp/screenshot-tool/mobile-screenshot.js "http://127.0.0.1:5173/pikaboard-dev/" "/tmp/test.png"`

## Notes
- Do **not** put secrets in this file.
- Token is in `backend/.env` as `PIKABOARD_TOKEN=<value>`
- Dev branch: `npm run dev` only, never build
- Main branch: build for production
