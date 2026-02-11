# Agent Roles

## Core Roles
- `pika`:
  - captain/orchestrator
  - creates tasks in `inbox`
  - keeps workload flowing across boards
- `mewtwo` (alias `pika-ops`):
  - ops QA coordinator
  - assigns or rejects tasks from `inbox`
  - owns `in_review` gate and decides `done` vs return to `in_progress`
- specialist agents (`bulbi`, `mew`, `evoli`, `psykokwak`, `sala`, `tortoise`, others):
  - execute implementation tasks
  - produce test evidence
  - hand off to `in_review`

## Governance
- one workflow source only: `docs/TEAM_WORKFLOW.md`
- roles doc defines ownership only, not step-by-step workflow details
