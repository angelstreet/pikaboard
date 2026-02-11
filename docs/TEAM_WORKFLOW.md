# Team Workflow

## Purpose
Single source of truth for how tasks move through PikaBoard.

## Owners
- `pika` creates tasks and puts them in `inbox`
- `mewtwo` (alias `pika-ops`) triages `inbox`, assigns work, and owns quality gate decisions
- Specialist agents execute assigned work
- Owner audits `done` and archives completed tasks

## Status Flow
`inbox -> up_next -> in_progress -> in_review -> done`

## Status Rules
- `inbox`: created by `pika`
- `up_next`: set by `mewtwo` when assigned and ready
- `in_progress`: execution started by assigned specialist
- `in_review`: execution complete, evidence attached, waiting for `mewtwo` QA gate
- `done`: accepted by `mewtwo`

## Decision Rules
- `mewtwo` can reject at assignment time:
  - Keep in `inbox` with rejection reason and required changes
- `mewtwo` can reject at review time:
  - Move `in_review -> in_progress` with actionable remediation steps
- `mewtwo` accepts when quality gates pass:
  - Move `in_review -> done`

## Required Evidence Before `in_review`
Run:

```bash
./scripts/pre-review-check.sh
```

Attach to task comment:
- what changed
- how tested
- check output summary

## Anti-Patterns
- moving to `in_review` without test evidence
- accepting to `done` without QA gate
- human approval as required step in task progression

## Notes
- Owner does not approve work in-flight
- Owner checks `done` and archives when appropriate
