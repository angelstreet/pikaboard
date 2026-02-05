# PikaBoard Agent Architecture

## Overview

PikaBoard is not just a task management UI — it's the **Mission Control** for a team of AI agents. Each agent is specialized for a domain and works autonomously while coordinating through the shared task board.

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
