# PikaBoard

Agent dashboard for OpenClaw — track tasks, routines, and skills.

## Quick Start

```bash
# Clone and enter
cd pikaboard

# Backend
cd backend
npm install
cp .env.example .env
npm run dev  # → http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

## Features

- 📋 **Kanban Board** — Track tasks through inbox → up_next → in_progress → in_review → done
- 🔄 **Routines** — View OpenClaw cron jobs (today/week/month)
- 🧩 **Skills** — Browse installed skills

## API

```
GET    /api/tasks          List tasks (filter: ?status=inbox)
POST   /api/tasks          Create task
GET    /api/tasks/:id      Get task
PATCH  /api/tasks/:id      Update task
DELETE /api/tasks/:id      Delete task

GET    /api/activity       List recent activity
POST   /api/activity       Log activity (internal)

GET    /api/crons          OpenClaw cron jobs
GET    /api/skills         Installed skills
```

## Auth

Set `PIKABOARD_TOKEN` in `.env`. All requests require:

```
Authorization: Bearer <token>
```

## Development

```bash
# Run backend tests
cd backend && npm test

# Lint
npm run lint
```

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind
- **Backend:** Hono + better-sqlite3
- **Database:** SQLite

## License

MIT
