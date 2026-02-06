# PikaBoard Task Workflow

## Kanban Status Flow

```
inbox → up_next → in_progress → in_review → done
                       ↓
                   [TESTING]
                       ↓
                  in_review
```

## Status Definitions

| Status | Who | What |
|--------|-----|------|
| `inbox` | Human | New tasks, unsorted |
| `up_next` | Human/Agent | Prioritized, ready to pick up |
| `in_progress` | Agent | Currently being worked on |
| `in_review` | Agent → Human | Implementation + testing complete, awaiting human review |
| `done` | Human | Approved and verified |

## Agent Workflow Rules

### 1. Pick Up Task
- Move from `up_next` → `in_progress`
- Log: "Starting work on #{task_id}"

### 2. Implement
- Write code, make changes
- Commit frequently to `dev` branch
- Push to remote

### 3. TEST BEFORE REVIEW ⚠️

**This is mandatory. No exceptions.**

Before moving to `in_review`, agent MUST:

```bash
# For frontend changes:
curl -sk https://localhost/pikaboard-dev/ | head -20  # Check HTML loads
curl -sk https://localhost/pikaboard-dev/assets/*.js | grep "expected_content"  # Verify build

# For API changes:
curl -X GET http://localhost:3001/api/health  # Health check
curl -X GET http://localhost:3001/api/tasks   # Test endpoint

# For UI changes (if agent-browser available):
agent-browser open "https://localhost/pikaboard-dev/"
agent-browser snapshot  # Get accessibility tree
agent-browser screenshot /tmp/test.png
agent-browser close
```

**Log test results in task comment before moving to review.**

### 4. Submit for Review
- Move from `in_progress` → `in_review`
- Include in comment:
  - What was changed
  - How it was tested
  - Test results/screenshot

### 5. Human Review
- Human checks `/pikaboard-dev/`
- If approved: Human moves to `done`
- If issues: Human moves back to `in_progress` with feedback

## Checklist Before `in_review`

- [ ] Code committed to `dev` branch
- [ ] Pushed to remote (`git push origin dev`)
- [ ] Deployed to dev (`./scripts/deploy-dev.sh` OR manual build)
- [ ] **Tested with curl/agent-browser**
- [ ] **Test results logged**

## Anti-Patterns (DON'T)

❌ Ask human to test without testing yourself first
❌ Move to `in_review` without verifying deployment
❌ Skip the curl/browser check
❌ Commit after deploy script (script stashes uncommitted changes!)

## Correct Order

1. Write code
2. `git add && git commit && git push`
3. Deploy (or manual build)
4. **Test with curl/agent-browser**
5. Move to `in_review` with test results
