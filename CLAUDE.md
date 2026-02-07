# CLAUDE.md - PikaBoard Project Context

## What is PikaBoard?

Agent management dashboard - a full-stack task/kanban board for orchestrating AI agents. Monorepo with backend API + React frontend.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Hono (Node.js) + TypeScript |
| Database | SQLite (better-sqlite3, WAL mode) |
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS 3 (class-based dark mode) |
| Routing | React Router v6 |
| DnD | @dnd-kit |
| Charts | recharts |
| Testing | Vitest (unit), shell scripts (API), Playwright (E2E) |
| Module system | ESM throughout |

## Project Structure

```
pikaboard/
├── backend/src/
│   ├── index.ts              # Entry point, middleware, route registration
│   ├── db/index.ts           # SQLite schema, migrations, WAL setup
│   ├── middleware/auth.ts     # Bearer token auth (optional if no PIKABOARD_TOKEN)
│   └── routes/               # 16 route modules (~4200 lines)
│       ├── tasks.ts           # Task CRUD + filtering
│       ├── boards.ts          # Board management
│       ├── activity.ts        # Activity logging
│       ├── agents.ts          # Agent status/logs/stats
│       ├── questions.ts       # Q&A approval workflow
│       ├── proposals.ts       # Agent proposals
│       ├── goals.ts           # Goal management
│       ├── stats.ts           # Dashboard statistics
│       ├── insights.ts        # Analytics
│       ├── usage.ts           # Token usage tracking
│       ├── system.ts          # System health/resources
│       ├── files.ts           # File browser
│       ├── skills.ts          # Skills discovery
│       ├── library.ts         # Skill library
│       ├── crons.ts           # Scheduled tasks
│       └── config.ts          # Configuration
├── frontend/src/
│   ├── main.tsx               # Entry: ThemeProvider + BrowserRouter
│   ├── App.tsx                # 11 routes
│   ├── api/client.ts          # API client with 3-min TTL cache
│   ├── api/demoClient.ts      # Demo mode
│   ├── components/            # 26 components
│   ├── pages/                 # 11 pages
│   ├── context/ThemeContext.tsx
│   ├── hooks/useTaskNotifications.ts
│   └── types/goal.ts
├── tests/                     # api/, e2e/, sanity/
├── scripts/                   # deploy-dev.sh, deploy-prod.sh, pre-review-check.sh
└── .github/workflows/         # CI pipeline
```

## Quick Commands

```bash
npm run install:all          # Install all deps
npm run dev                  # Start backend + frontend (concurrently)
cd backend && npm run dev    # Backend only (tsx watch, port 3001)
cd frontend && npm run dev   # Frontend only (vite, port 5173)
npm test                     # All tests (unit + API + E2E)
cd backend && npm test       # Unit tests only
cd frontend && npx tsc --noEmit  # Type check frontend
npm run lint                 # Lint both packages
```

## Environments

| Env | UI URL | API URL |
|-----|--------|---------|
| Local | `http://localhost:5173/pikaboard-dev/` | `http://localhost:3001/api` |
| Dev | `https://65.108.14.251:8080/pikaboard-dev/` | `https://65.108.14.251:8080/api` |
| Prod | `https://65.108.14.251:8080/pikaboard/` | `https://65.108.14.251:8080/api` |

Health checks: `curl -s http://127.0.0.1:3001/health` and `/api/system/health`

## Database

SQLite at `backend/pikaboard.db`. Tables: `boards`, `tasks`, `activity`, `goals`, `goal_tasks`.

**Task statuses:** `inbox` -> `up_next` -> `in_progress` -> `testing` -> `in_review` -> `done` | `rejected`

**Priorities:** `low`, `medium`, `high`, `urgent`

Migrations run automatically on startup in `backend/src/db/index.ts`.

## Auth

Bearer token via `Authorization: Bearer $PIKABOARD_TOKEN` header. Disabled if `PIKABOARD_TOKEN` not set in `backend/.env`. Applied to all `/api/*` routes.

## Key Patterns

- **API responses:** `{ error: "message" }` for errors, direct JSON for success
- **Frontend caching:** `ApiClient` has a 3-min TTL cache, invalidated after mutations
- **DB migrations:** Pragma-based column checks, table recreation for constraint changes
- **Dark mode:** Tailwind `dark:` classes, root class toggle, localStorage persistence
- **Drag & drop:** @dnd-kit sortable with position column updates
- **Activity logging:** All mutations log to `activity` table

## Branch Workflow

- `dev` branch for all development (never build, `npm run dev` only)
- `main` branch for production (protected, PR required)
- Deploy dev: `./scripts/deploy-dev.sh`
- Deploy prod: `./scripts/deploy-prod.sh` (only after explicit approval)

## Config Files

- `backend/.env` - secrets (PIKABOARD_TOKEN, PORT, DATABASE_PATH)
- `.env.example` - template for env vars
- `backend/tsconfig.json` - strict, ES2022, ESNext modules
- `frontend/tsconfig.json` - strict, noUnusedLocals/Params, `@/*` path alias
- `frontend/vite.config.ts` - base path from `VITE_BASE_PATH`, proxy `/api` to `:3001`
- `frontend/tailwind.config.js` - `pika-*` color palette (amber/orange)

## Testing Requirements

| Change Type | Required Tests |
|------------|---------------|
| Backend API | Unit + API tests |
| Frontend UI | E2E + visual check |
| Bug fix | Regression test |
| New feature | Unit + API + E2E |
| Refactoring | All existing tests pass |

Pre-review: `./scripts/pre-review-check.sh` (branch, build, tests, lint)
