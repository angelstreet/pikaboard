# Multi-Agent Autonomy Architecture

> PikaBoard's AI agent system - autonomous Pokemon team working together.

## Overview

PikaBoard runs on a **multi-agent architecture** where specialized AI agents autonomously manage different domains. Each agent has their own identity, heartbeat, and can spawn sub-agents for parallel work.

## The Pokemon Team

| Agent | Emoji | Board | Domain | Workspace |
|-------|-------|-------|--------|-----------|
| **Pika** | ⚡ | 1 (Main) | Captain, Coordinator | `~/.openclaw/workspace/` |
| **Bulbi** | 🌱 | 6 (PikaBoard) | PikaBoard Development | `shared/projects/pikaboard/` |
| **Mew** | ✨ | 7 (Ideas Lab) | Ideas & Product | `~/.openclaw/agents/mew/` |
| **Evoli** | 🔥 | 4 (VirtualPyTest) | QA & Testing | `shared/projects/virtualpytest/` |
| **Psykokwak** | 🦆 | 5 (EZPlanning) | EZPlanning Dev | `shared/projects/ezplanning/` |
| **Sala** | 🦎 | 3 (Work) | Work Projects | `~/.openclaw/agents/sala/` |
| **Tortoise** | 🐢 | 2 (Personal) | Personal Assistant | `~/.openclaw/agents/tortoise/` |

## Agent Identity

Each agent has their own identity files:

```
~/.openclaw/agents/{agent}/
├── SOUL.md      # Personality, purpose, values
├── CONTEXT.md   # How they work, tools, workflows
├── config.json  # Skills, plugins configuration
└── memory/      # Agent-specific memory
```

### SOUL.md
Defines WHO the agent is:
- Name and emoji
- Core purpose
- Personality traits
- Values and principles

### CONTEXT.md
Defines HOW the agent works:
- Board assignment
- Workspace location
- How to check for tasks
- How to submit questions when blocked
- Reporting guidelines

## Heartbeat System

### Autonomous Heartbeats (Safeguard)
Every agent has a **15-minute cron heartbeat** that:

1. Loads their SOUL.md (identity)
2. Checks active sub-agent count
3. Queries their board's `up_next` tasks
4. **Spawns sub-agents** for available tasks (up to 10 concurrent)
5. Moves tasks to `in_progress`
6. Reports status

```
┌─────────────────────────────────────────────────────────┐
│  Every 15 minutes (cron)                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Bulbi   │  │  Mew    │  │ Evoli   │  │ Sala    │... │
│  │heartbeat│  │heartbeat│  │heartbeat│  │heartbeat│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       ▼            ▼            ▼            ▼          │
│  [Check board] [Check board] [Check board] [Check board]│
│       │            │            │            │          │
│       ▼            ▼            ▼            ▼          │
│  [Spawn subs] [Spawn subs] [Spawn subs] [Spawn subs]   │
└─────────────────────────────────────────────────────────┘
```

### Captain Wake-Up (On-Demand)
Pika (captain) can **wake up any agent immediately** when tasks are waiting:

```python
# Captain sees tasks piling up on board 6
# Instead of waiting for Bulbi's heartbeat...
sessions_spawn(label="bulbi-wake", task="Wake up, check board 6...")
```

This provides:
- **Heartbeat** = Safeguard (no agent sleeps forever)
- **Captain wake-up** = Responsiveness (immediate action when needed)

## Sub-Agent Spawning

Each agent is a **COORDINATOR** that delegates work to sub-agents:

```
┌─────────────┐
│   Bulbi     │  (Coordinator)
│  heartbeat  │
└──────┬──────┘
       │ spawns up to 10
       ▼
┌──────┴──────┬──────────────┬──────────────┐
│ sub-agent-1 │ sub-agent-2  │ sub-agent-3  │ ...
│ (task #108) │ (task #120)  │ (task #103)  │
└─────────────┴──────────────┴──────────────┘
```

### Why Sub-Agents?
- **Parallel execution**: Multiple tasks worked simultaneously
- **Isolation**: Each task gets clean context
- **Cost efficiency**: Sub-agents use cheaper models (Kimi K2.5)
- **Scalability**: Up to 10 concurrent per agent

## Task Flow

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌──────┐
│  inbox  │ → │ up_next  │ → │ in_progress │ → │ done │
└─────────┘    └──────────┘    └─────────────┘    └──────┘
     │              │                │               │
     │         Agent picks      Sub-agent        Verified
  Human/AI      up task          works           complete
  creates
```

### Status Meanings
- **inbox**: New task, needs triage
- **up_next**: Ready for agent to pick up
- **in_progress**: Sub-agent actively working
- **in_review**: Needs verification (deprecated - AI verifies)
- **done**: Completed and verified

## Chain of Command

```
                    ┌─────────┐
                    │   Jo    │  (Human)
                    │ (owner) │
                    └────┬────┘
                         │ directs
                         ▼
                    ┌─────────┐
                    │  Pika   │  (Captain)
                    │   ⚡    │
                    └────┬────┘
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Bulbi 🌱│    │  Mew ✨ │    │Evoli 🔥 │ ...
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
    sub-agents      sub-agents      sub-agents
```

### Responsibilities
- **Jo**: Strategy, approvals, personal tasks
- **Pika**: Coordination, wake-ups, cross-agent issues, verification
- **Specialists**: Domain expertise, task execution via sub-agents

## Questions Workflow

When an agent is blocked:

1. Agent POSTs question to `/api/questions`
2. Question appears in PikaBoard Inbox
3. Jo (or Pika) answers in UI
4. Agent receives answer and continues

```bash
# How agents submit questions (in their CONTEXT.md)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent":"bulbi","question":"How should I handle X?","context":"Working on task #123"}' \
  "http://127.0.0.1:3001/api/questions"
```

## Model Configuration

| Role | Model | Cost |
|------|-------|------|
| Pika (captain) | Kimi K2.5 (→ Sonnet fallback) | Low |
| Agent heartbeats | Kimi K2.5 (→ Sonnet fallback) | Low |
| Sub-agents | Kimi K2.5 (→ Sonnet fallback) | Low |
| Complex tasks | Opus 4.5 (manual override) | High |

## Cron Jobs

### Agent Heartbeats (15min)
- `Bulbi Heartbeat (15min)` - Board 6
- `Mew Heartbeat (15min)` - Board 7
- `Evoli Heartbeat (15min)` - Board 4
- `Psykokwak Heartbeat (15min)` - Board 5
- `Sala Heartbeat (15min)` - Board 3
- `Tortoise Heartbeat (15min)` - Board 2

### Daily Routines
- `Morning 8AM Briefing` - Daily summary to Jo
- `Daily 10PM Summary` - End of day report

## File Structure

```
~/.openclaw/
├── workspace/
│   ├── shared/
│   │   └── projects/
│   │       ├── pikaboard/      # Bulbi's domain
│   │       ├── virtualpytest/  # Evoli's domain
│   │       └── ezplanning/     # Psykokwak's domain
│   ├── agents/
│   │   ├── pika/
│   │   ├── bulbi/
│   │   ├── mew/
│   │   ├── evoli/
│   │   ├── psykokwak/
│   │   ├── sala/
│   │   └── tortoise/
│   ├── memory/                 # Shared timeline
│   ├── SOUL.md                 # Pika's soul
│   ├── AGENTS.md               # How agents work
│   └── HEARTBEAT.md            # Pika's heartbeat config
└── openclaw.json               # OpenClaw config
```

## Adding a New Agent

1. Create agent folder: `~/.openclaw/agents/{name}/`
2. Write `SOUL.md` (identity)
3. Write `CONTEXT.md` (how they work)
4. Create board in PikaBoard
5. Add cron heartbeat (15min)
6. Update this doc

---

*Last updated: 2026-02-07*
*Architecture version: 2.0 (Multi-Agent Autonomy)*
