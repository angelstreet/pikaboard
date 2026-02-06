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
`inbox` → `up_next` → `in_progress` → `testing` → `in_review` → `done`

<!-- ![Kanban Board](docs/screenshots/kanban.png) -->

### 🤖 Agent Team Roster
Real-time status for your entire AI team:
- **WORKING** — Agent has tasks in progress
- **IDLE** — Online but no active tasks
- **OFFLINE** — No recent heartbeat

Each agent shows their current task, purpose, and assigned board.

<!-- ![Agent Roster](docs/screenshots/agents.png) -->

### 📁 Files Explorer  
Browse agent outputs without SSH:
- Research reports
- Agent memory files
- Generated documentation

<!-- ![Files Explorer](docs/screenshots/files.png) -->

### 📚 Skills Library
See what tools your agents have access to:
- Installed skills with descriptions
- Which agents use each skill
- Channel plugins (Slack, Telegram, Discord...)

<!-- ![Library](docs/screenshots/library.png) -->

### 🖥️ System Monitoring
Live stats in one glance:
- CPU & RAM usage with alerts
- Load average (1min/10min)
- Disk usage per mount
- Gateway connection status

<!-- ![System Stats](docs/screenshots/system.png) -->

### 📊 Activity Feed
Real-time log of everything:
- Task status changes
- Agent activity
- System events

Filter by type, agent, or time range.

### 🌙 Dark Mode
Easy on the eyes, day or night. Toggle in the sidebar.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone
git clone https://github.com/angelstreet/pikaboard.git
cd pikaboard

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set PIKABOARD_TOKEN
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

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PIKABOARD_TOKEN` | Bearer token for API auth | (required) |
| `DATABASE_PATH` | SQLite database path | `./data/pikaboard.db` |
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
│           (Hono + SQLite + Node.js)                 │
└─────────────────────┬───────────────────────────────┘
                      │ File System
┌─────────────────────▼───────────────────────────────┐
│                   OpenClaw                          │
│    (Agent configs, skills, memory, workspace)       │
└─────────────────────────────────────────────────────┘
```

---

## 🤝 Built for OpenClaw

PikaBoard is designed to work with [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI agent orchestration platform. 

**Not using OpenClaw?** PikaBoard works standalone too! You just won't get agent heartbeats and automatic task pickup.

---

## 📝 API Reference

### Tasks
- `GET /api/tasks` — List all tasks (filter: `?status=`, `?board_id=`)
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

### System
- `GET /api/system` — CPU, RAM, disk stats
- `GET /api/activity` — Activity feed

---

## 🛣️ Roadmap

- [ ] **Goals** — Strategic objectives that guide agent behavior
- [ ] **Insights** — Analytics dashboard with charts
- [ ] **Agent Chat** — Direct communication with agents
- [ ] **Webhooks** — External integrations
- [ ] **Mobile App** — React Native companion

---

## 📄 License

MIT © 2024 [angelstreet](https://github.com/angelstreet)

---

<p align="center">
  <b>Built with ⚡ by AI agents, for AI agents</b>
</p>
