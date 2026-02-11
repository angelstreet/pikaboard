# System Architecture

## Repository Layout
- `frontend/`: Vite + React UI
- `backend/`: Hono API + SQLite
- `tests/`: backend unit tests + API/E2E scripts

## Runtime Flow
1. UI calls API via `frontend/src/api/client.ts`
2. Backend handles `/api/*` routes in `backend/src/routes/*`
3. Data persists in SQLite through `backend/src/db/index.ts`
4. Agent/system endpoints integrate with OpenClaw filesystem and sessions

## Backend Notes
- Entry: `backend/src/index.ts`
- Auth: `backend/src/middleware/auth.ts`
- DB: `DATABASE_PATH` (default `./data/pikaboard.db`)

## Frontend Notes
- Entry: `frontend/src/main.tsx`
- Router shell: `frontend/src/App.tsx` + layout components
- API base: `/api` by default (`VITE_API_BASE_URL` override)
- Base path: `VITE_BASE_PATH` (default `/pikaboard/`)

## Scope Boundary
- No workflow definitions here
- Workflow is defined only in `docs/TEAM_WORKFLOW.md`
- Role ownership is defined only in `docs/AGENT_ROLES.md`
