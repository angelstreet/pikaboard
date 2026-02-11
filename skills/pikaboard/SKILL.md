---
name: pikaboard
description: "Interact with PikaBoard task management API. Use when creating, updating, listing, or managing tasks. Agent-first kanban for AI teams. Triggers on: tasks, kanban, board, todo, backlog, sprint."
metadata:
  openclaw:
    emoji: "📋"
    requires:
      bins: ["node", "npm", "curl"]
    install:
      - id: clone
        kind: git
        repo: https://github.com/angelstreet/pikaboard
        branch: main
        label: "Clone PikaBoard repository"
      - id: backend
        kind: script
        cwd: "pikaboard/backend"
        run: "npm ci --no-audit --fund=false && npm run build"
        label: "Install backend dependencies"
      - id: frontend
        kind: script
        cwd: "pikaboard/frontend"
        run: "npm ci --no-audit --fund=false && npm run build"
        label: "Build frontend"
      - id: env
        kind: prompt
        message: "Create .env with DATABASE_PATH and PIKABOARD_API_TOKEN"
        label: "Configure environment"
---

# PikaBoard

Agent-first task/kanban dashboard. **PikaBoard is the source of truth for tasks.**

## Security And Reliability

- Treat `PIKABOARD_API_TOKEN` as a secret credential. Use a dedicated token for PikaBoard.
- Before dependency install, review package scripts:
  - `cat package.json backend/package.json frontend/package.json`
- Prefer deterministic install with lockfiles (`npm ci`) over `npm install`.
- If you do not fully trust upstream code, run setup/build in a sandboxed container or VM.

## Quick Start

After install, start the server:
```bash
cd pikaboard/backend && npm start
```

Access dashboard at `http://localhost:3001`

## Configuration

Create `backend/.env`:
```env
DATABASE_PATH=./pikaboard.db
PIKABOARD_API_TOKEN=your-secret-token
PORT=3001
```

Add to your TOOLS.md:
```markdown
## PikaBoard
- **API:** http://localhost:3001/api/
- **Token:** your-secret-token
```

Agent runtime variables:
```bash
# Required:
export PIKABOARD_API_URL="http://localhost:3001/api"
export PIKABOARD_API_TOKEN="your-secret-token"
export AGENT_NAME="bulbi"
# Optional:
# export BOARD_ENV_FILE="$HOME/.openclaw/agents/bulbi/.pikaboard.env"
```

## Task Commands

Reference tasks by ID:
- `task 12` or `#12` → view task
- `move #12 to done` → status change
- `create task "Fix bug"` → new task

## API Reference

See `backend/API.md` for full endpoint documentation (single canonical doc).

### Common Operations

**List tasks:**
```bash
curl -H "Authorization: Bearer $PIKABOARD_API_TOKEN" "$PIKABOARD_API_URL/tasks"
```

**Create task:**
```bash
curl -X POST -H "Authorization: Bearer $PIKABOARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fix bug","status":"inbox","priority":"high","tags":["bug","backend"]}' \
  "$PIKABOARD_API_URL/tasks"
```

**Update status:**
```bash
curl -X PATCH -H "Authorization: Bearer $PIKABOARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  "$PIKABOARD_API_URL/tasks/123"
```

## Enums

| Field | Values |
|-------|--------|
| status | `inbox`, `up_next`, `in_progress`, `testing`, `in_review`, `done`, `rejected` |
| priority | `low`, `medium`, `high`, `urgent` |

## Agent Onboarding (Simple Path)

Use the helper to map each agent to a board automatically:

```bash
cd pikaboard
MY_BOARD_ID="$(
  ./skills/pikaboard/scripts/setup-agent-board.sh | sed -n 's/^MY_BOARD_ID=//p' | tail -n1
)"
export MY_BOARD_ID
```

What it does:
- Requires `PIKABOARD_API_URL`, `PIKABOARD_API_TOKEN`, `AGENT_NAME`
- Finds board by `BOARD_NAME` (default: `AGENT_NAME`)
- Creates board if missing
- Prints `MY_BOARD_ID=<id>`
- Verifies `GET /api/tasks?board_id=<id>&status=up_next`

Optional:
```bash
export BOARD_NAME="Bulbi"
export BOARD_ENV_FILE="$HOME/.openclaw/agents/bulbi/.pikaboard.env"
./skills/pikaboard/scripts/setup-agent-board.sh
```

## Multi-Agent Setup

Each agent can have their own board. Use `board_id` parameter:
```bash
curl "$PIKABOARD_API_URL/tasks?board_id=6" -H "Authorization: Bearer $PIKABOARD_API_TOKEN"
```

Board assignments:
- Board 1: Pika (main)
- Board 2: Tortoise (personal)
- Board 3: Sala (work)
- Board 4: Evoli (VirtualPyTest)
- Board 5: Psykokwak (EZPlanning)
- Board 6: Bulbi (PikaBoard)
- Board 7: Mew (Ideas)

## Validation Checklist

Run after setup:

```bash
# 1) API reachable
curl -s http://localhost:3001/health

# 2) Auth works
curl -s -H "Authorization: Bearer $PIKABOARD_API_TOKEN" "$PIKABOARD_API_URL/boards"

# 3) Board mapping works
echo "$MY_BOARD_ID"

# 4) Agent can read own queue
curl -s -H "Authorization: Bearer $PIKABOARD_API_TOKEN" \
  "$PIKABOARD_API_URL/tasks?board_id=$MY_BOARD_ID&status=up_next"
```
