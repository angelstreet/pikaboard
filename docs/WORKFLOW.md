# PikaBoard Task Workflow

## Kanban Status Flow

```
inbox → up_next → in_progress → in_review → done
                       ↓
                   [TESTING]
                       ↓
                  in_review (requires passing tests)
```

## Status Definitions

| Status | Who | What |
|--------|-----|------|
| `inbox` | Human | New tasks, unsorted |
| `up_next` | Human/Agent | Prioritized, ready to pick up |
| `in_progress` | Agent | Currently being worked on |
| `in_review` | Agent → Human | Implementation + **tests passing**, awaiting human review |
| `done` | Human | Approved and verified |

## Agent Workflow Rules

### 1. Pick Up Task
- Move from `up_next` → `in_progress`
- Log: "Starting work on #{task_id}"

### 2. Implement
- Write code, make changes
- **Write tests for new code** (no exceptions)
- Commit frequently to `dev` branch
- Push to remote

### 3. TEST BEFORE REVIEW ⚠️ (MANDATORY)

**This is enforced. No exceptions.**

Before moving to `in_review`, agent MUST run:

```bash
./scripts/pre-review-check.sh
```

This script verifies:
- ✅ On `dev` branch
- ✅ No uncommitted changes
- ✅ All commits pushed
- ✅ Backend builds successfully
- ✅ Frontend builds successfully
- ✅ Unit tests pass
- ✅ API tests pass
- ✅ Linting passes

**If any check fails, fix it before moving to `in_review`.**

#### Manual Testing Commands

```bash
# Quick verification
npm run test:ci

# Full test suite
npm test

# Specific checks
cd backend && npm run test          # Unit tests
bash tests/api/run.sh               # API tests
bash tests/e2e/run.sh               # E2E tests
```

### 4. Submit for Review

```bash
# 1. Run pre-review check (MUST PASS)
./scripts/pre-review-check.sh

# 2. Move task to in_review via API or UI

# 3. Include in task comment:
#    - What was changed
#    - How it was tested  
#    - Test results (copy from pre-review-check.sh output)
```

### 5. Human Review

- Human checks `/pikaboard-dev/`
- If approved: Human moves to `done`
- If issues: Human moves back to `in_progress` with feedback

## Checklist Before `in_review`

```bash
./scripts/pre-review-check.sh
```

Output must show: **✅ All checks passed!**

## Anti-Patterns (DON'T)

❌ Move to `in_review` without running pre-review check
❌ Commit after running pre-review check (run it again!)
❌ Skip tests because "it's just a small change"
❌ Push broken tests to `dev`
❌ Ask human to test without testing yourself first

## Correct Order

1. Write code + tests
2. `git add && git commit && git push`
3. Run `./scripts/pre-review-check.sh` (must pass!)
4. Deploy if needed: `./scripts/deploy-dev.sh`
5. Move task to `in_review` with test results

## CI/CD Enforcement

GitHub Actions runs tests on every push:

```yaml
on:
  push:
    branches: [main, dev]
```

**A failing CI blocks merge to `main`.**

## Testing Requirements

See detailed testing documentation:
- [tests/README.md](tests/README.md) - Testing overview
- [tests/TESTING.md](tests/TESTING.md) - Detailed requirements
- [tests/e2e/README.md](tests/e2e/README.md) - E2E testing guide

## Emergency: Tests Broken on `dev`

1. **STOP** - Don't add more changes
2. Create branch `fix/tests`
3. Fix the failing tests
4. PR to `dev` with only test fixes
5. After merge, resume normal workflow
