# Workspace Architecture

This document describes the recommended workspace structure for multi-agent OpenClaw deployments.

## Overview

```
workspace/
├── shared/              # Shared resources across all agents
│   ├── projects/        # Git repositories (pikaboard, virtualpytest, etc.)
│   ├── skills/          # Installed OpenClaw skills
│   ├── data/            # Datasets, exports, downloads
│   └── research/        # Research documents, references
│
├── agents/              # Per-agent workspaces
│   ├── pika/            # Main orchestrator agent
│   ├── bulbi/           # PikaBoard development
│   ├── mew/             # Product & ideas
│   ├── evoli/           # Testing & QA
│   ├── tortoise/        # Personal assistant
│   ├── sala/            # Work projects
│   └── psykokwak/       # EZPlanning
│
├── memory/              # Shared timeline (daily logs)
│   └── YYYY-MM-DD.md    # Daily activity logs
│
├── skills -> shared/skills  # Symlink for OpenClaw compatibility
│
└── *.md                 # Core config files
    ├── SOUL.md          # Agent identity & personality
    ├── USER.md          # User preferences
    ├── MEMORY.md        # Long-term memory
    ├── TOOLS.md         # Environment-specific config
    ├── AGENTS.md        # Agent behavior guidelines
    └── HEARTBEAT.md     # Periodic check instructions
```

## Design Principles

### 1. Shared Resources
Projects, skills, and data live in `shared/` so all agents can access them without duplication.

### 2. Agent Isolation
Each agent has their own folder in `agents/` for work files, drafts, and outputs. This enables:
- Clear ownership of artifacts
- Easy filtering by agent in File views
- Isolated workspaces that don't pollute shared resources

### 3. Memory Separation
- `memory/` contains daily logs (shared timeline, all agents contribute)
- `MEMORY.md` at root contains curated long-term memory
- Agent-specific notes go in their `agents/<name>/` folder

## File Routing

When an agent creates a file:

| Type | Location |
|------|----------|
| PRD, spec, research doc | `agents/<agent>/` |
| Code changes | `shared/projects/<repo>/` |
| Dataset, export | `shared/data/` |
| Daily notes | `memory/YYYY-MM-DD.md` |
| Skill updates | `shared/skills/<skill>/` |

## PikaBoard Integration

The File tab in PikaBoard can expose this structure:
- Tree view with agent folders
- Filter by agent
- Recent files across all agents
- Preview for markdown files
