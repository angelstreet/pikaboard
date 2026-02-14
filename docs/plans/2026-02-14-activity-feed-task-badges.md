# Activity Feed Task Badge Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align Tasks tab format in Activity Feed to match Agents tab by adding action badges and removing redundant text prefixes.

**Architecture:** Frontend-only change to ActivityFeed component. Add two helper functions (getTaskActionBadge, stripTaskPrefix) and update the ActivityItem rendering logic for task activities.

**Tech Stack:** React, TypeScript, Tailwind CSS

**Design Reference:** `docs/plans/2026-02-14-activity-feed-task-badges-design.md`

---

## Task 1: Add Task Action Badge Helper Function

**Files:**
- Modify: `frontend/src/components/ActivityFeed.tsx:183-202` (after getActivityColor function)

**Step 1: Add getTaskActionBadge function**

Add this function after the `getActivityColor` function (around line 202):

```typescript
// Get action badge for task activities
function getTaskActionBadge(type: string): { label: string; color: string } | null {
  const badges = {
    task_created: {
      label: 'Created',
      color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
    },
    task_completed: {
      label: 'Completed',
      color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    },
    task_updated: {
      label: 'Updated',
      color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
    },
    task_deleted: {
      label: 'Deleted',
      color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
    },
    task_moved: {
      label: 'Moved',
      color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
    },
  };

  return badges[type as keyof typeof badges] || null;
}
```

**Step 2: Verify syntax**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/ActivityFeed.tsx
git commit -m "feat(activity-feed): add task action badge helper function"
```

---

## Task 2: Add Task Prefix Stripping Helper Function

**Files:**
- Modify: `frontend/src/components/ActivityFeed.tsx:~110` (after stripStatusPrefix function)

**Step 1: Add stripTaskPrefix function**

Add this function after the `stripStatusPrefix` function (around line 108):

```typescript
// Strip action prefixes from task activity messages
function stripTaskPrefix(message: string): string {
  return message.replace(/^(Created|Completed|Updated|Deleted|Moved)\s+task:\s*/i, '');
}
```

**Step 2: Verify syntax**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/components/ActivityFeed.tsx
git commit -m "feat(activity-feed): add task prefix stripping helper"
```

---

## Task 3: Update Task Badge Display Logic

**Files:**
- Modify: `frontend/src/components/ActivityFeed.tsx:279-287` (task activity badges section)

**Step 1: Update task badges section**

Replace the current task activity badges section (lines 279-287) with:

```typescript
              {/* Task activity badges */}
              {isTask && taskActorDisplay && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {taskActorDisplay.full}
                  </span>
                  {(() => {
                    const actionBadge = getTaskActionBadge(activity.type);
                    return actionBadge ? (
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${actionBadge.color}`}>
                        {actionBadge.label}
                      </span>
                    ) : null;
                  })()}
                  {metadata?.task_status && getStatusBadge(metadata.task_status, true)}
                </div>
              )}
```

**Step 2: Update task message display**

Update line 289 to strip task prefixes. Replace:

```typescript
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {isAgent ? formatAgentMessage(activity.message, metadata ?? undefined, !!metadata?.agent_label) : activity.message}
              </p>
```

With:

```typescript
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {isAgent
                  ? formatAgentMessage(activity.message, metadata ?? undefined, !!metadata?.agent_label)
                  : isTask
                    ? stripTaskPrefix(activity.message)
                    : activity.message}
              </p>
```

**Step 3: Verify syntax**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/components/ActivityFeed.tsx
git commit -m "feat(activity-feed): align task badges with agent format

- Add action badge (Created/Updated/Completed/Deleted/Moved)
- Strip redundant action prefix from task messages
- Show task status badge when status changed
- Maintain visual consistency with Agents tab format"
```

---

## Task 4: Visual Testing

**Files:**
- Test: `frontend/src/components/ActivityFeed.tsx`

**Step 1: Start development server**

Run: `cd frontend && npm run dev`
Expected: Server starts on http://localhost:5173/pikaboard-dev/

**Step 2: Navigate to Activity Feed**

1. Open http://localhost:5173/pikaboard-dev/ in browser
2. Navigate to page with Activity Feed (likely Dashboard or dedicated Activity page)
3. Click on "Tasks" tab in Activity Feed

**Step 3: Verify task badge display**

Check that task activities show:
- ✅ Actor badge (e.g., "🔦 Lanturn")
- ✅ Action badge (Created/Updated/Completed/Deleted/Moved) with correct color
- ✅ Status badge when task status changed
- ✅ Clean message without "Completed task:" prefix
- ✅ Task reference (#123) preserved in message

**Step 4: Verify different activity types**

Test display for all task activity types:
- `task_created` → Shows "Created" badge (purple)
- `task_updated` → Shows "Updated" badge (yellow)
- `task_completed` → Shows "Completed" badge (green)
- `task_deleted` → Shows "Deleted" badge (red)
- `task_moved` → Shows "Moved" badge (blue)

**Step 5: Verify Agents tab unchanged**

Switch to "Agents" tab and verify:
- ✅ Agent activities still display correctly
- ✅ No visual regressions

**Step 6: Test dark mode**

1. Toggle dark mode
2. Verify all badge colors are readable
3. Verify dark mode variants display correctly

**Step 7: Document completion**

If all visual tests pass, the implementation is complete.

---

## Task 5: Final Verification and Cleanup

**Step 1: Run type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 2: Run linter**

Run: `cd frontend && npm run lint`
Expected: No errors or only warnings

**Step 3: Check git status**

Run: `git status`
Expected: Clean working directory (all changes committed)

**Step 4: Review commits**

Run: `git log --oneline -5`
Expected: See 3 commits related to task badge alignment

---

## Testing Notes

**Manual Testing Required:**
- This is a UI-only change, so visual testing in the browser is essential
- No automated tests needed for this change (visual/cosmetic update)
- Focus on verifying all badge combinations display correctly
- Test both light and dark modes

**Edge Cases to Verify:**
- Task activities without actor/assignee
- Task activities without status change
- Very long task descriptions (ensure wrapping works)
- Multiple task activities in sequence

---

## Rollback Plan

If issues are found:

```bash
# Revert all commits
git revert HEAD~2..HEAD

# Or reset to before changes
git reset --hard HEAD~3
```
