# Multi-Agent Autonomy Architecture

## Overview

Each agent runs as its own OpenClaw instance with full autonomy - they can spawn sub-agents, have their own sessions, and work independently.

## Architecture

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Pika (18789)    │  │ Bulbi (18790)   │  │ Mew (18791)     │
│ Captain         │  │ PikaBoard Dev   │  │ Ideas/Product   │
│ ~/.openclaw/    │  │ ~/.openclaw-    │  │ ~/.openclaw-    │
│                 │  │    bulbi/       │  │    mew/         │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Evoli (18792)   │  │ Sala (18793)    │  │ Tortoise (18794)│
│ VirtualPyTest   │  │ Work Projects   │  │ Personal        │
│ ~/.openclaw-    │  │ ~/.openclaw-    │  │ ~/.openclaw-    │
│    evoli/       │  │    sala/        │  │    tortoise/    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐
│ Psykokwak(18795)│
│ EZPlanning      │
│ ~/.openclaw-    │
│    psykokwak/   │
└─────────────────┘
```

## Port Assignments

| Agent     | Port  | Profile Flag              |
|-----------|-------|---------------------------|
| Pika      | 18789 | (default, no flag)        |
| Bulbi     | 18790 | `--profile bulbi`         |
| Mew       | 18791 | `--profile mew`           |
| Evoli     | 18792 | `--profile evoli`         |
| Sala      | 18793 | `--profile sala`          |
| Tortoise  | 18794 | `--profile tortoise`      |
| Psykokwak | 18795 | `--profile psykokwak`     |

## Profile Structure

Each profile gets isolated state:

```
~/.openclaw-{agent}/
├── openclaw.json      # Agent-specific config
├── workspace/
│   ├── SOUL.md        # Agent identity (copied from shared)
│   ├── AGENTS.md      # Agent instructions
│   ├── TOOLS.md       # Shared tools reference
│   └── memory/        # Agent's memory files
└── agents/
    └── main/
        └── sessions/  # Agent's session transcripts
```

## Commands

### Start an agent manually
```bash
openclaw --profile bulbi gateway run --port 18790
```

### Install as systemd service
```bash
# Create service file
sudo tee /etc/systemd/system/openclaw-bulbi.service << 'EOF'
[Unit]
Description=OpenClaw Gateway - Bulbi
After=network.target

[Service]
Type=simple
User=jndoye
Environment=PATH=/home/jndoye/.nvm/versions/node/v22.22.0/bin:/usr/bin
ExecStart=/home/jndoye/.nvm/versions/node/v22.22.0/bin/openclaw --profile bulbi gateway run --port 18790
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable openclaw-bulbi
sudo systemctl start openclaw-bulbi
```

### Check status
```bash
sudo systemctl status openclaw-bulbi
```

## Communication Between Agents

Agents can communicate via:

1. **PikaBoard API** - Shared task management
2. **sessions_send** - Direct messaging (requires gateway URL)
3. **Shared files** - Common workspace directories

## Shared Resources

All agents share:
- `~/.openclaw/workspace/shared/` - Projects, skills, data
- PikaBoard API at `http://127.0.0.1:3001/api/`
- Same auth token for PikaBoard

## Heartbeats

Each agent has its own cron heartbeat configured in their profile's config.
