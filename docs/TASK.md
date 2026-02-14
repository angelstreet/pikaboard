# PikaBoard Task Guide

Complete reference for task creation, content requirements, and workflow phases.

---

## Card vs Modal: What Goes Where

### Card (Board View)
**Visible at a glance on the board:**
- **Title/Name** - One-line summary with optional prefix
- **Priority badge** - Visual indicator (low/medium/high/urgent)
- **Tags** - Quick filters (e.g., `bug`, `feature`, `ops`)
- **Assignee badge** - Agent avatar/emoji
- **Deadline** - Due date if set

**Card title format:**
```
[PREFIX] Brief description (< 70 chars)
```

### Modal (Detail View)
**Full task information:**
- **Name** - Full title (editable)
- **Description** - Detailed requirements, context, acceptance criteria
- **Status** - Current workflow phase
- **Priority** - Urgency level
- **Tags** - Multiple tags for filtering/categorization
- **Board** - Which board/project this belongs to
- **Assignee** - Which agent should do this
- **Deadline** - Target completion date
- **Rating** - Quality score (1-5) after completion
- **Rejection Reason** - Why it was rejected (if applicable)

---

## Task Prefixes

Use prefixes in task titles to signal intent:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `[ISSUE]` | Bug/problem to fix | `[ISSUE] Login fails on mobile` |
| `[APPROVAL]` | Needs human approval | `[APPROVAL] Deploy v2.1 to prod` |
| `[QUESTION]` | Agent needs clarification | `[QUESTION] Which API endpoint?` |
| `[BLOCKER]` | Blocking other work | `[BLOCKER] Database migration stuck` |
| `[FEATURE]` | New functionality | `[FEATURE] Add dark mode toggle` |
| `[REFACTOR]` | Code improvement | `[REFACTOR] Clean up API routes` |
| `[DOCS]` | Documentation task | `[DOCS] Update deployment guide` |
| `[TEST]` | Testing/QA task | `[TEST] E2E tests for checkout` |

**Note:** Prefixes are optional but help with filtering and inbox triage.

---

## Status Flow & Content Requirements

### 1. `inbox` - Task Created

**Who:** Pika (task creator/orchestrator)

**Required Content:**

**Title:**
- Clear, specific action verb (not "look into" or "check")
- Include what AND where/why if not obvious
- ✅ Good: `[ISSUE] Fix dashboard loading timeout on /stats page`
- ❌ Bad: `Check the dashboard issue`

**Description (MUST include):**
1. **Context:** What's the situation? Why does this matter?
2. **Requirements:** What needs to be done? Be specific.
3. **Acceptance Criteria:** How do we know it's done?
4. **Test Requirements:** What tests are needed?

**Example:**
```markdown
## Context
The /stats page times out after 30s when loading data for boards with >1000 tasks.
Users see a blank page and have to refresh.

## Requirements
- Optimize the query in GET /api/insights endpoint
- Add pagination support for large datasets
- Cache computed stats for 5 minutes

## Acceptance Criteria
- [ ] Page loads in < 3s for boards with 5000+ tasks
- [ ] No timeout errors in browser console
- [ ] Stats refresh when new tasks created

## Test Requirements
- API test: verify endpoint returns within 3s for large dataset
- E2E test: load /stats page with 5000 tasks, verify no timeout
- Load test: 10 concurrent requests should complete
```

**Priority Guidelines:**
- `urgent` - System down, data loss, security issue
- `high` - User-facing bug, blocking other work
- `medium` - Feature work, improvements (default)
- `low` - Nice-to-have, future enhancements

**Tags:**
- App: `App:pikaboard`, `App:kozy`, `App:soulworld`
- Technical: `backend`, `frontend`, `database`, `api`
- Type: `bug`, `feature`, `refactor`, `docs`, `test`
- Domain: `auth`, `payments`, `notifications`, etc.

---

### 2. `up_next` - Assigned & Ready

**Who:** Lanturn (ops coordinator)

**Lanturn verifies:**
- ✅ Task is well-defined (clear requirements)
- ✅ Acceptance criteria are testable
- ✅ No blockers or dependencies
- ✅ Assigned to appropriate specialist agent
- ✅ Priority matches urgency

**If task is unclear, Lanturn:**
1. Adds comment with specific questions
2. Keeps in `inbox` with reason
3. May tag Pika to clarify

**What Lanturn adds:**
- Assignee (specialist agent)
- Any additional context from triage
- Adjusted priority if needed
- Deadline if time-sensitive

---

### 3. `in_progress` - Work Started

**Who:** Assigned specialist agent (bulbi, mew, evoli, etc.)

**Specialist must:**
1. **Read full description** before starting
2. **Ask questions** if anything unclear (comment or create `[QUESTION]` task)
3. **Work incrementally** with frequent commits
4. **Update progress** in comments (optional but helpful)

**What specialist should NOT do:**
- Assume requirements without asking
- Skip test requirements
- Move to `in_review` without running tests
- Work on multiple tasks simultaneously

**Stale detection:**
- Tasks in `in_progress` > 10 minutes without activity get `stale` tag
- Lanturn is alerted to check on stalled work

---

### 4. `in_review` - Evidence Required

**Who:** Specialist agent (before moving from `in_progress`)

**CRITICAL:** Do NOT move to `in_review` without completing ALL of these:

### Pre-Review Checklist

**Run:**
```bash
./scripts/pre-review-check.sh
```

**Attach evidence in task comment:**

```markdown
## Changes
- Modified: `backend/src/routes/insights.ts:45-78` - added query optimization
- Created: `tests/api/test-insights-performance.sh` - load test
- Updated: `frontend/src/pages/Stats.tsx:120` - loading state

## Testing
### Unit Tests
✅ All pass (15/15)

### API Tests
✅ New endpoint test: GET /api/insights completes in 2.1s with 5000 tasks
✅ All existing tests pass (22/22)

### E2E Tests
✅ Stats page loads without timeout
✅ Data displays correctly
✅ Screenshots: [desktop](link) [mobile](link)

### Manual Testing
- Tested with 10k tasks on dev board
- Verified cache invalidation works
- Checked dark mode rendering

## Pre-Review Check Output
```
✅ Git branch: dev
✅ No uncommitted changes
✅ Commits pushed
✅ Backend builds
✅ Frontend builds
✅ Unit tests: 15/15 pass
✅ API tests: 22/22 pass
✅ Linting: clean
```
```

**Screenshots (for UI changes):**
- Desktop view (1280x800)
- Mobile view (375x812)
- Both light and dark mode
- Use: `npx tsx scripts/screenshot-proof.ts --task <id> --viewport both`

---

### 5. `done` - Accepted

**Who:** Lanturn (QA gate)

**Lanturn verifies:**
- ✅ All acceptance criteria met
- ✅ Tests pass and are appropriate
- ✅ Code quality is good
- ✅ No regressions introduced
- ✅ Evidence is complete

**If rejected, Lanturn:**
1. Moves back to `in_progress`
2. Adds **actionable remediation steps** in rejection reason
3. Updates task with specific issues to fix

**Rejection example:**
```
Missing E2E test for error handling.

Please add test case in tests/e2e/specs/stats.spec.js:
- Simulate API timeout
- Verify error message displays
- Verify retry button works

Then re-run pre-review-check.sh and update evidence.
```

---

## Field Reference

### Name (required)
- **Max length:** No hard limit, but keep < 100 chars for card display
- **Format:** `[PREFIX] Action verb + specific target`
- **Examples:**
  - ✅ `[FEATURE] Add search filter to agent roster`
  - ✅ `[ISSUE] Fix memory leak in activity feed polling`
  - ❌ `Improve the UI` (too vague)
  - ❌ `Something is broken` (not actionable)

### Description
- **Format:** Markdown
- **Structure:** Context → Requirements → Acceptance Criteria → Tests
- **Length:** As long as needed to be clear
- **Include:**
  - Why this matters (context)
  - What needs to change (requirements)
  - How to verify (acceptance criteria)
  - What tests are needed (test plan)

### Status
**Valid values:** `inbox`, `up_next`, `in_progress`, `testing`, `in_review`, `done`, `rejected`

**Flow:** `inbox` → `up_next` → `in_progress` → `in_review` → `done`

**Note:** `testing` status exists but is rarely used (testing happens in `in_progress` before moving to `in_review`)

### Priority
**Valid values:** `low`, `medium`, `high`, `urgent`

**Guidelines:**
- `urgent` - Drop everything, fix now (< 1 hour)
- `high` - Critical path, do today
- `medium` - Normal priority (default)
- `low` - When you have time

### Tags
- **Format:** Array of strings
- **Max recommended:** 3-5 tags per task
- **Common tags:**
  - **App:** `App:pikaboard`, `App:kozy`, `App:soulworld` (which app this task belongs to)
  - **Technical:** `backend`, `frontend`, `database`, `api`, `ui`, `ux`
  - **Type:** `bug`, `feature`, `refactor`, `docs`, `test`, `ops`
  - **Status:** `stale`, `blocked`, `waiting`
  - **Domain:** `auth`, `payments`, `notifications`, `dashboard`

### Board ID
- Which project board this belongs to
- Default: First board if not specified
- Can be moved between boards

### Deadline
- **Format:** `YYYY-MM-DD`
- **Optional:** Only set for time-sensitive work
- **Examples:** Product launch, external deadline, scheduled maintenance

### Rating (post-completion)
- **Valid values:** 1-5 or null
- **Set by:** Lanturn or owner after task is done
- **Criteria:**
  - 5 - Exceptional: exceeded expectations, great tests, clean code
  - 4 - Good: met all criteria, solid work
  - 3 - Acceptable: met criteria, minor issues
  - 2 - Poor: barely met criteria, missing tests
  - 1 - Unacceptable: did not meet criteria

### Rejection Reason
- **Set by:** Lanturn when moving back to `in_progress`
- **Must be actionable:** Tell them exactly what to fix
- **Format:** Bullet list of specific issues + how to fix

---

## Anti-Patterns

**Bad Task Titles:**
- ❌ `Fix the thing`
- ❌ `Update code`
- ❌ `Look into the issue John mentioned`
- ❌ `Improve performance`

**Good Task Titles:**
- ✅ `[ISSUE] Fix null pointer in task assignment webhook`
- ✅ `[FEATURE] Add CSV export to usage dashboard`
- ✅ `[REFACTOR] Extract auth middleware to separate file`

**Bad Descriptions:**
- ❌ Just a link to Slack message
- ❌ "Do the thing we talked about"
- ❌ Copy-paste of error message with no context
- ❌ Vague requirements like "make it faster"

**Good Descriptions:**
- ✅ Context + Requirements + Acceptance Criteria + Tests
- ✅ Links to relevant docs/code
- ✅ Screenshots/error logs when applicable
- ✅ Specific, measurable success criteria

**Bad Test Evidence:**
- ❌ "Tests pass" without showing output
- ❌ "I tested it manually" without screenshots
- ❌ "Should be fine" without running pre-review-check
- ❌ Partial test coverage with excuses

**Good Test Evidence:**
- ✅ Full pre-review-check.sh output
- ✅ Screenshots for UI changes
- ✅ Specific test commands + results
- ✅ Manual test steps documented

---

## Quick Reference

### Pika (Task Creator)
```
1. Write clear title with prefix
2. Fill description: Context → Requirements → Criteria → Tests
3. Set priority
4. Add relevant tags
5. Put in inbox
```

### Lanturn (Ops Coordinator)
```
1. Review inbox tasks
2. Verify requirements are clear
3. Assign to specialist
4. Move to up_next
---
At review:
1. Check all acceptance criteria met
2. Verify test evidence complete
3. Run pre-review-check.sh output
4. Accept → done OR Reject → in_progress with reason
```

### Specialist Agents
```
1. Read full description
2. Ask questions if unclear
3. Work incrementally
4. Write tests BEFORE implementation (TDD)
5. Run ./scripts/pre-review-check.sh
6. Attach evidence
7. Move to in_review
```

---

## See Also

- **Workflow Rules:** [docs/TEAM_WORKFLOW.md](TEAM_WORKFLOW.md)
- **Agent Roles:** [docs/AGENT_ROLES.md](AGENT_ROLES.md)
- **Test Requirements:** [tests/TESTING.md](../tests/TESTING.md)
- **API Reference:** [backend/API.md](../backend/API.md)
