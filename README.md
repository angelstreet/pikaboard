# PikaBoard ⚡

**Mission Control for AI Agent Teams**

PikaBoard is a task management dashboard designed for [OpenClaw](https://openclaw.io) — the AI agent orchestration platform. Track tasks, manage boards, view routines, and coordinate multiple specialized agents from a single interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)

## ✨ Features

- **📋 Kanban Boards** — Organize tasks across customizable boards with drag-and-drop
- **🔄 Task Workflow** — Track tasks through `inbox` → `up_next` → `in_progress` → `testing` → `in_review` → `done`
- **⏰ Routines** — View OpenClaw cron jobs (today/week/month schedules)
- **🧩 Skills** — Browse installed agent skills
- **📊 Activity Feed** — Real-time log of all task and agent activity
- **🤖 Multi-Agent** — Assign tasks to specialized agents (dev, QA, personal assistant)
- **🌙 Dark Mode** — Easy on the eyes, day or night
- **🔐 Token Auth** — Simple bearer token authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/angelstreet/pikaboard.git
cd pikaboard

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env to set your PIKABOARD_TOKEN
npm run dev  # → http://localhost:3001

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

### Environment Variables

Create `backend/.env`:

```env
# Required: Authentication token for API access
PIKABOARD_TOKEN=your-secret-token-here

# Optional: OpenClaw integration paths
OPENCLAW_HOME=/home/user/.openclaw
OPENCLAW_SKILLS=/home/user/.openclaw/skills
```

## 📡 API Reference

All endpoints require authentication:

```bash
Authorization: Bearer <your-token>
Content-Type: application/json
```

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks?status=inbox` | Filter by status |
| `GET` | `/api/tasks?board_id=1` | Filter by board |
| `GET` | `/api/tasks/:id` | Get single task |
| `POST` | `/api/tasks` | Create task |
| `PATCH` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

#### Create Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Implement feature X",
    "description": "Add the new feature with tests",
    "status": "inbox",
    "priority": "high",
    "board_id": 1,
    "tags": ["feature", "frontend"]
  }'
```

#### Update Task Status

```bash
curl -X PATCH http://localhost:3001/api/tasks/42 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

#### Task Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Task title |
| `description` | string | | Detailed description |
| `status` | enum | | `inbox`, `up_next`, `in_progress`, `testing`, `in_review`, `done` |
| `priority` | enum | | `low`, `medium`, `high`, `urgent` |
| `board_id` | number | | Board to assign task to |
| `tags` | string[] | | Array of tag labels |
| `deadline` | string | | ISO date string |

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `GET` | `/api/boards/:id` | Get single board |
| `GET` | `/api/boards/:id/tasks` | Get tasks for a board |
| `POST` | `/api/boards` | Create board |
| `PATCH` | `/api/boards/:id` | Update board |
| `DELETE` | `/api/boards/:id` | Delete board |

#### Create Board

```bash
curl -X POST http://localhost:3001/api/boards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development",
    "icon": "💻",
    "color": "blue"
  }'
```

### Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/activity` | List recent activity |
| `GET` | `/api/activity?limit=50` | Limit results |
| `POST` | `/api/activity` | Log activity (internal) |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Dashboard statistics |

### OpenClaw Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/crons` | List OpenClaw cron jobs |
| `GET` | `/api/skills` | List installed skills |

## 🏗️ Architecture

```
pikaboard/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── api/           # API client
│   │   └── config/        # App configuration
│   └── dist/              # Production build
│
├── backend/               # Hono + SQLite
│   ├── src/
│   │   ├── db/            # Database setup
│   │   └── routes/        # API routes
│   └── data/              # SQLite database
│
└── scripts/               # Deployment scripts
```

### Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend:** Hono (lightweight web framework), better-sqlite3
- **Database:** SQLite (zero-config, portable)

## 🤖 Agent Integration

PikaBoard is designed to work with AI agents. Here's how agents interact:

### Agent Workflow

1. Agent checks for tasks assigned to its board
2. Picks a task from `up_next`, moves to `in_progress`
3. Completes the work, moves to `testing`
4. After verification, moves to `in_review`
5. Activity is automatically logged

### Example: Agent Picking Up Work

```bash
# Check for tasks
curl "http://localhost:3001/api/tasks?board_id=6&status=up_next" \
  -H "Authorization: Bearer $TOKEN"

# Claim task
curl -X PATCH "http://localhost:3001/api/tasks/42" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "in_progress"}'

# ... do work ...

# Mark complete
curl -X PATCH "http://localhost:3001/api/tasks/42" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "done"}'
```

### Multi-Agent Setup

Create specialized boards for different agents:

| Agent | Board | Domain |
|-------|-------|--------|
| Pika | Main | Coordination, triage |
| Bulbi | PikaBoard | Development tasks |
| Tortue | Personal | Personal assistant |
| Sala | Work Projects | QA, testing |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full multi-agent design.

## 🛠️ Development

### Running Tests

```bash
cd backend
npm test
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

### Database

SQLite database is stored at `backend/data/pikaboard.db`. Schema is auto-created on first run.

To reset:

```bash
rm backend/data/pikaboard.db
npm run dev  # Recreates with seed data
```

## 📦 Deployment

### With PM2

```bash
# Build
cd backend && npm run build
cd ../frontend && npm run build

# Start backend
pm2 start backend/dist/index.js --name pikaboard-backend

# Serve frontend with nginx or similar
```

### With Docker (Coming Soon)

```bash
docker-compose up -d
```

## 🔒 Security

- **Token Authentication:** All API requests require a valid bearer token
- **No External Calls:** PikaBoard doesn't phone home
- **Local SQLite:** Your data stays on your machine
- **Configurable CORS:** Lock down origins in production

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Commit Convention

```
type: short description

- detail 1
- detail 2

Task #N (if applicable)
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **OpenClaw:** https://openclaw.io
- **GitHub:** https://github.com/angelstreet/pikaboard
- **Issues:** https://github.com/angelstreet/pikaboard/issues

---

*Built with 💛 for the OpenClaw community*
