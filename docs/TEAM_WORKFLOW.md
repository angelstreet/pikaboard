# Team Workflow

## Purpose
Single source of truth for how tasks move through PikaBoard.

## Owners
- `pika` creates tasks and puts them in `inbox`
- `lanturn` triages `inbox`, assigns work, and owns quality gate decisions
- Specialist agents execute assigned work
- Owner audits `done` and archives completed tasks

## Status Flow
`inbox -> up_next -> in_progress -> in_review -> done`

## Status Rules
- `inbox`: created by `pika`
- `up_next`: set by `lanturn` when assigned and ready
- `in_progress`: execution started by assigned specialist
- `in_review`: execution complete, evidence attached, waiting for `lanturn` QA gate
- `done`: accepted by `lanturn`

## Decision Rules
- `lanturn` can reject at assignment time:
  - Keep in `inbox` with rejection reason and required changes
- `lanturn` can reject at review time:
  - Move `in_review -> in_progress` with actionable remediation steps
- `lanturn` accepts when quality gates pass:
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

## Stale Detection + Alerting
- The 15s watcher (`~/.openclaw/bin/pikaboard-watcher-daemon.py:19`) polls `inbox`, `up_next`, `in_review`, and `in_progress`; it wakes `lanturn` whenever new triage-ready work appears or an agent has sat in `in_progress` longer than 10 minutes.
- When a task is flagged as stalled, the watcher adds the `stale` tag so UI cards can show the alert icon; `lanturn` still runs the cron job but now sees the stale tag and forces reassignment or QA.
- No `in_progress`, `up_next`, or `in_review` cell should stay idle >10 minutes; the watcher logs `stalled_in_progress` along with the new `stale` tag (watcher output includes the reason list).

## Debug & Tests
- **Watcher health:** `pm2 status pikaboard-watcher` / `ps -ef | grep pikaboard-watcher` ensure the 15s daemon is alive; tail `~/.pm2/logs/pikaboard-watcher-out.log` to see `Changes detected` lines and the `stale` tag confirmations.
- **Cron verification:** poll `GET http://127.0.0.1:3001/api/crons` and check the job `b2ca724f-d375-44a0-8889-3ca0f6208eb8` for `state.lastRunAtMs`. Trigger a new task (create via `curl -X POST .../api/tasks` with `status=inbox`) and re-poll; the timestamp should update within one poll cycle (~30 s). The watcher output will also mention `waking Lanturn` plus the reason.
- **Stale tagging:** to force a stale alert in dev, temporarily reduce `IN_PROGRESS_STALE` in the watcher script or manually move a task to `in_progress`, wait 10 minutes, then check for the `stale` tag on that task via `curl /api/tasks/<id>`; the log prints `Tagged #<id> as stale`.
- **Manual cron run:** `openclaw cron run b2ca724f-d375-44a0-8889-3ca0f6208eb8` should wake Lanturn, but our current Node build rejects the respawn flag (`node: bad option: --disable-warning=ExperimentalWarning`). Watch for this error, adjust `openclaw` to skip the flag (or downgrade Node), then re-run; otherwise rely on the watcher + API timestamps above to prove the cron fires.
