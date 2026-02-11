# PikaBoard Agent Architecture

## Overview

PikaBoard is not just a task management UI — it's the **Mission Control** for a team of AI agents. Each agent is specialized for a domain and works autonomously while coordinating through the shared task board.

## Codebase Architecture

This repo is a small monorepo with a React frontend and a Node/TypeScript API backend.

### Repo Layout

- `frontend/`: Vite + React UI
- `backend/`: Hono (Node server) + SQLite
- `tests/`: API and E2E scripts (plus backend unit tests)
- Root `package.json`: convenience scripts that orchestrate `backend/` and `frontend/`

### Backend (API)

- Entrypoint: `backend/src/index.ts`
  - Hono app with CORS, optional request logger, and a public `/health`.
  - All `/api/*` routes are protected by `backend/src/middleware/auth.ts` when `PIKABOARD_TOKEN` is set (Bearer token). If it is unset, the middleware allows all requests.
- Routers: `backend/src/routes/*.ts` mounted under `/api/...`
  - Core resources include tasks/boards/activity/goals/system/agents/files, plus OpenClaw integration endpoints.
- Persistence: SQLite via `better-sqlite3` in `backend/src/db/index.ts`
  - DB path is `DATABASE_PATH` (default `./data/pikaboard.db`).
  - Creates tables (`boards`, `tasks`, `activity`, `goals`, `goal_tasks`) and runs lightweight migrations at startup.
- Host/OpenClaw integration:
  - File browsing is implemented in `backend/src/routes/files.ts` and is gated by an allowlist of `~/.openclaw/...` paths.
  - Agent status and proposals are derived from OpenClaw filesystem state and correlated with the PikaBoard DB (see `backend/src/routes/agents.ts` and `backend/src/routes/proposals.ts`).
  - OpenClaw session info is surfaced via `backend/src/routes/openclaw.ts` (calls `openclaw sessions --json`).

### Frontend (UI)

- Entrypoints: `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
  - React Router routes render inside a shared shell: `frontend/src/components/Layout.tsx`.
- API client: `frontend/src/api/client.ts`
  - Base URL defaults to `/api` (override with `VITE_API_BASE_URL`).
  - Sends `Authorization: Bearer <token>` if `localStorage.pikaboard_token` is set.
  - Uses a small in-memory cache (3 minute TTL) for GETs with invalidation after mutations.
- Deployment under a sub-path:
  - Vite `base` is set in `frontend/vite.config.ts` (default `/pikaboard/`, override with `VITE_BASE_PATH`).
  - In dev, Vite proxies `/api` to `http://localhost:3001`.

### Data Flow (Typical)

1. UI calls `frontend/src/api/client.ts` (e.g. tasks/boards).
2. Requests hit the backend under `/api/...` and read/write SQLite (`backend/src/db/index.ts`).
3. Some endpoints also read OpenClaw workspace/agent state from disk (files/agents/proposals/openclaw).

### Testing

- Backend unit tests: `backend` uses `vitest`.
- API/E2E: driven by scripts in `tests/` (see root `package.json`).

## The Pokemon Team

```
                    ┌─────────────────┐
                    │    👤 Human     │
                    │      (Jo)       │
                    └────────┬────────┘
                             │ talks to
                             ▼
                    ┌─────────────────┐
                    │   🔴 Pika       │
                    │   (Captain)     │
                    │   Main Board    │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  🟢 Bulbi   │   │  🔵 Tortue  │   │  🟡 Sala    │
    │  (Dev)      │   │  (Personal) │   │  (Work)     │
    │  PikaBoard  │   │  Personal   │   │  Work       │
    └─────────────┘   └─────────────┘   └─────────────┘
```

## Agent Roles

| Agent | Domain | Board | Skills |
|-------|--------|-------|--------|
| **Pika** | Captain, Coordination | Main | All-rounder, delegation, oversight |
| **Bulbi** | Development | PikaBoard | React, TypeScript, Node.js, Git |
| **Tortue** | Personal Assistant | Personal | French law, Swiss tax, Calendar, Email |
| **Sala** | Work Projects | Work Projects | QA, Testing, Selenium, Automation |

## Communication Patterns

### 1. Top-Down (Pika → Agents)

Pika assigns tasks to specialized agents:

```
Pika sees task in PikaBoard
    │
    ├── Task is for PikaBoard board?
    │   └── Spawn Bulbi (or Bulbi-like sub-agent)
    │
    ├── Task is Personal?
    │   └── Spawn Tortue
    │
    └── Task is Work?
        └── Spawn Sala
```

### 2. Bottom-Up (Agents → Pika)

Agents report back through PikaBoard:

```
Agent completes task
    │
    ├── Updates task status in PikaBoard
    ├── Posts activity to /api/activity
    ├── Pika sees update in Activity Feed
    └── Pika reviews and approves (or requests changes)
```

### 3. Peer Communication (Agent ↔ Agent)

Agents can collaborate on tasks:

```
Bulbi needs design help
    │
    ├── Posts comment on task: "@Wanda need mockup"
    ├── PikaBoard notifies Wanda (when implemented)
    └── Wanda responds with deliverable
```

## Activation Modes

### Mode A: On-Demand (Current)

Pika spawns agents when needed:

```python
# Pika logic
if task.board == "PikaBoard" and task.status == "up_next":
    spawn_agent(label="bulbi", task=task)
```

**Pros:** Efficient, only runs when work exists
**Cons:** Requires Pika to be active

### Mode B: Heartbeat (Autonomous)

Agents wake on schedule and check for work:

```bash
# Cron: Every 15 minutes
*/15 * * * * openclaw agent wake --name bulbi \
  --message "Check PikaBoard board for tasks assigned to you"
```

**Pros:** Agents work independently
**Cons:** Burns tokens even when idle

### Mode C: Hybrid (Recommended)

Combine both approaches:

1. **Agents have heartbeats** — wake every 15-30 min
2. **Pika can wake them on-demand** — for urgent tasks
3. **Agents can spawn sub-agents** — for subtasks

```
┌────────────────────────────────────────────────────────┐
│                    HYBRID MODEL                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Heartbeat (cron)     On-Demand (Pika)                │
│       │                     │                         │
│       ▼                     ▼                         │
│   ┌───────┐            ┌───────┐                      │
│   │ Bulbi │◄───────────│ Pika  │                      │
│   └───┬───┘            └───────┘                      │
│       │                                               │
│       ▼                                               │
│   ┌───────────┐                                       │
│   │ Sub-agent │  (Bulbi spawns for specific task)    │
│   └───────────┘                                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Agent Structure

Each agent has its own workspace:

```
~/.openclaw/agents/
├── pika/                    # Captain (exists)
│   ├── SOUL.md              # Personality & role
│   ├── AGENTS.md            # Operating instructions
│   ├── memory/              # Daily notes, state
│   └── config.json          # OpenClaw config
│
├── bulbi/                   # PikaBoard Developer
│   ├── SOUL.md
│   ├── memory/
│   │   ├── WORKING.md       # Current task state
│   │   └── 2026-02-05.md    # Daily log
│   └── skills/              # Specialized skills
│       └── pikaboard/       # PikaBoard-specific
│
├── tortue/                  # Personal Assistant
│   ├── SOUL.md
│   ├── memory/
│   └── skills/
│       ├── french-law/
│       └── swiss-tax/
│
└── sala/                    # Work Projects
    ├── SOUL.md
    ├── memory/
    └── skills/
        ├── selenium/
        └── qa-automation/
```

## SOUL.md Template

```markdown
# SOUL.md — {Agent Name}

## Identity
- **Name:** Bulbi
- **Type:** Specialist Agent
- **Domain:** Software Development
- **Board:** PikaBoard (board_id: 6)
- **Reports to:** Pika

## Personality
Methodical, detail-oriented, clean code advocate.
Prefers small PRs over big bang changes.
Tests before committing.

## Skills
- React, TypeScript, Tailwind CSS
- Node.js, Express
- Git workflow (feature branches)
- Code review

## Constraints
- Only work on PikaBoard board tasks
- Always use `dev` branch
- Deploy to dev environment only
- Report completion to Pika via task status

## Memory
- Read WORKING.md on wake
- Update daily log after each task
- Check task comments for context
```

## PikaBoard Integration

### Task Assignment

Tasks include `assigned_to` field:

```json
{
  "id": 42,
  "name": "Add dark mode",
  "board_id": 6,
  "assigned_to": "bulbi",
  "status": "in_progress"
}
```

### Activity Feed

All agent actions logged:

```json
{
  "type": "agent_activity",
  "agent": "bulbi",
  "action": "task_completed",
  "task_id": 42,
  "duration_sec": 180,
  "tokens": 25000,
  "commit": "abc123"
}
```

### Capacity Monitoring

Before spawning, check system resources:

```json
{
  "active_agents": 2,
  "max_agents": 5,
  "cpu_percent": 45,
  "memory_percent": 62,
  "can_spawn": true
}
```

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] PikaBoard task management
- [x] Activity feed
- [x] Agents sidebar
- [x] Sub-agent spawning (ephemeral)

### Phase 2: Persistent Agents
- [ ] Create agent workspace structure
- [ ] SOUL.md per agent
- [ ] Agent-specific memory
- [ ] Heartbeat crons

### Phase 3: Autonomous Operation
- [ ] Agents check own boards
- [ ] Peer-to-peer task handoff
- [ ] Capacity-based auto-scaling
- [ ] Cross-agent collaboration

### Phase 4: Intelligence
- [ ] Agents learn from past tasks
- [ ] Skill improvement over time
- [ ] Proactive suggestions
- [ ] Self-organizing team

## Open Source Vision

PikaBoard + Agent Architecture = **Mission Control for AI Teams**

Anyone can:
1. Deploy PikaBoard
2. Create specialized agents
3. Build their own Pokemon team
4. Contribute agents/skills to community

---

*This architecture is evolving. Updates welcome.*
