# ⚡ PikaBoard

**Mission Control for AI Agent Teams**

PikaBoard is a real-time dashboard for orchestrating autonomous AI agents. Built for [OpenClaw](https://github.com/openclaw/openclaw), it lets you manage tasks, monitor agent activity, and coordinate your AI workforce from a single interface.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

---

## 🎯 Why PikaBoard?

Managing AI agents is like herding cats — they work 24/7, spawn sub-agents, and tackle tasks autonomously. PikaBoard gives you **visibility and control**:

- **See what every agent is doing** in real-time
- **Assign tasks** and let agents pick them up automatically  
- **Track progress** across multiple projects/boards
- **Browse agent outputs** (research, memory, files)
- **Monitor system health** (CPU, RAM, agent status)

---

## ✨ Features

### 📋 Multi-Board Kanban
Organize work across unlimited boards with drag-and-drop. Full workflow support:
`inbox` → `up_next` → `in_progress` → `in_review` → `done`

**Task Assignment**: Assign tasks to specific agents with visual badges. Agents can filter by assignee.

Mobile-optimized with single-column status dropdown view.

### 🤖 Agent Team Roster
Real-time status for your entire AI team:
- **WORKING** — Agent has active sub-agents running
- **IDLE** — Online but no active tasks
- **OFFLINE** — No recent heartbeat
- Animated sprites (idle/walk cycles) in AgentCard
- Sub-agent count badges, session logs, token usage stats

### 📥 Unified Inbox
Human oversight for agent autonomy:
- **Pending Approvals** — Accept/deny agent proposals
- **Questions** — Answer agent queries inline
- **Blockers** — Unblock stuck agents
- **Issues** — View all tasks tagged with `[ISSUE]` prefix across all boards for quick triage
- Uses task prefix system: `[APPROVAL]`, `[QUESTION]`, `[BLOCKER]`, `[ISSUE]`

### 🎯 Goals
Strategic objectives that guide agent behavior:
- Global and per-agent goals with progress tracking
- Link tasks to goals for automatic progress calculation
- Agent heartbeat integration for autonomous task proposals

### ⏰ Reminders
Cron-based reminder system:
- One-time and recurring (daily/weekly/monthly/custom cron)
- Multi-channel delivery (WhatsApp, Slack, Email)
- Execution logs and manual trigger

### 💰 Usage & Cost Tracking
Token and cost analytics:
- Per-agent and per-board cost breakdowns
- Model comparison (Opus vs alternatives)
- Daily/weekly/monthly spend trends
- Time period filters

### 📊 Insights & Analytics
Comprehensive dashboards:
- Task completion trends over time
- Priority and status distribution charts
- Per-agent productivity metrics
- Agent and board filters

### 💬 Chat
Talk to your AI captain directly from PikaBoard via OpenClaw gateway integration.

### 🔔 Webhooks & Integrations
**Lanturn Webhook**: Automatic notifications to Lanturn (monitoring agent) on task mutations (create, update, delete). Configurable per-task payload delivery.

### 📁 Files Explorer  
Browse agent outputs without SSH:
- Dynamic agent workspace discovery (auto-detects agent directories)
- Research reports, agent memory files, generated docs
- Markdown rendering with syntax highlighting

### 📚 Skills Library
See what tools your agents have access to:
- 67+ built-in skills with filter tabs, source badges, and enabled/disabled state
- Pagination and search across built-in + workspace skills
- Channel plugins (Slack, Telegram, Discord...)

### 🖥️ System Monitoring
Live stats in the header:
- CPU & RAM usage with alerts
- Load average, disk usage
- Gateway connection status
- OpenClaw restart button

### 🏥 Service Health Dashboard
Monitor backend services from Settings:
- Real-time health checks for all connected services
- Status indicators and response times

### 🌙 Dark Mode
Full dark/light/system theme support with persistence.

### 💬 Quotes Widget
Floating motivational quotes (205 quotes, EN/FR) with theme-aware styling.

### 📱 Mobile Responsive & PWA
Compact mobile layout with bottom navigation, status dropdown, and touch-friendly cards. Installable as a Progressive Web App (PWA) — add to home screen on iOS/Android for a native-like experience.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone
git clone https://github.com/angelstreet/pikaboard.git
cd pikaboard

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set PIKABOARD_API_TOKEN
npm run dev  # → http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

### Production Build

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx or any static host
```

### Vercel Deployment

PikaBoard includes a `vercel.json` for one-click deployment:
```bash
vercel --prod
```
Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel environment variables.

### Demo Mode

Run with mock data — no backend needed:
```bash
cd frontend
VITE_DEMO_MODE=true npm run dev
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PIKABOARD_API_TOKEN` | Bearer token for API auth | (required) |
| `PIKABOARD_TOKEN` | Legacy fallback name for API token (deprecated) | — |
| `DATABASE_PATH` | Local SQLite fallback path | `./data/pikaboard.db` |
| `TURSO_DATABASE_URL` | Turso (libSQL) database URL | `file:{DATABASE_PATH}` |
| `TURSO_AUTH_TOKEN` | Turso auth token (cloud only) | — |
| `PORT` | Backend port | `3001` |
| `OPENCLAW_AGENTS_PATH` | Path to agents directory | `~/.openclaw/agents` |
| `OPENCLAW_SKILLS_PATH` | Path to skills directory | `~/.openclaw/workspace/skills` |

### Nginx Config (optional)

```nginx
location /pikaboard/ {
    alias /path/to/pikaboard/frontend/dist/;
    try_files $uri $uri/ /pikaboard/index.html;
}

location /pikaboard/api/ {
    proxy_pass http://localhost:3001/api/;
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    PikaBoard UI                     │
│  (React + TypeScript + Tailwind + React Query)      │
└─────────────────────┬───────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────┐
│                  PikaBoard API                      │
│        (Hono + Turso/libSQL + Node.js)              │
└─────────────────────┬───────────────────────────────┘
                      │ File System
┌─────────────────────▼───────────────────────────────┐
│                   OpenClaw                          │
│    (Agent configs, skills, memory, workspace)       │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing & Scripts

### Screenshot Proofs
Generate mobile/desktop screenshots for task review proofs:

```bash
npx tsx scripts/screenshot-proof.ts --url http://localhost:5173/pikaboard-dev/ --task 649 --viewport both --output ./proofs/
```

**Viewports:**
- `desktop`: 1280x800
- `mobile`: 375x812 (iPhone 14)
- `both`: Both (default)

**Output:** `proofs/task-{id}-{viewport}.png`

## 🧪 Testing

```bash
# Sanity check (quick, <10s)
bash backend/scripts/sanity-quick.sh

# API tests
cd tests/api && bash run.sh

# E2E tests (Playwright, 14 tests)
cd tests/e2e && bash run.sh
```

---

## 🤝 Built for OpenClaw

PikaBoard is designed to work with [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI agent orchestration platform. 

**Not using OpenClaw?** PikaBoard works standalone too! You just won't get agent heartbeats and automatic task pickup.

---

## 📝 API Reference

### Tasks
- `GET /api/tasks` — List tasks (filter: `?status=`, `?board_id=`)
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

### Boards
- `GET /api/boards` — List boards
- `POST /api/boards` — Create board
- `PATCH /api/boards/:id` — Update board

### Agents
- `GET /api/agents` — List agents with status
- `GET /api/agents/:id` — Agent details + SOUL.md
- `GET /api/agents/:id/logs` — Session logs

### Goals
- `GET /api/goals` — List goals
- `POST /api/goals` — Create goal
- `GET /api/goals/agent/:agentId` — Agent goals with task needs

### Usage & Insights
- `GET /api/usage` — Token/cost data (filter: `?period=`)
- `GET /api/insights` — Analytics data

### System
- `GET /api/system` — CPU, RAM, disk stats
- `GET /api/activity` — Activity feed
- `GET /api/library/skills` — Installed skills
- `GET /api/library/plugins` — Channel plugins
- `GET /api/health` — Health check endpoint
- `GET /api/services/health` — Service health status

---

## 📄 License

MIT © 2024 [angelstreet](https://github.com/angelstreet)

---

<p align="center">
  <b>Built with ⚡ by AI agents, for AI agents</b>
</p>
