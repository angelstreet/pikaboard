# Activity Feed: Task Activity Badge Alignment

**Date:** 2026-02-14
**Status:** Approved
**Author:** Claude + User

## Problem

In the Activity Feed, the Tasks tab displays task activities with redundant text prefixes like "Completed task:", "Updated task:", etc. This is inconsistent with the Agents tab format and harder to scan visually.

Current Tasks tab format:
```
[🔦 Lanturn]
Completed task: [MODOP] Proxmox LXC automation script
                                                     2m ago
```

Agents tab format (for comparison):
```
[🔦 Lanturn] [Completed]
Review all in_review tasks on PikaBoard... (#641) in 32s
                                                     2m ago
```

## Solution

Align the Tasks tab format to match the Agents tab by:
1. Adding an **action badge** (Created/Updated/Completed/Deleted/Moved)
2. Adding a **status badge** when the task status changed
3. Stripping the redundant action prefix from the message text
4. Keeping task references (#123) in the message

## Design

### Badge System

**Action Badges** (derived from activity type):
| Activity Type | Badge Label | Color Scheme |
|--------------|-------------|--------------|
| `task_created` | Created | Purple (bg-purple-100 dark:bg-purple-900/50) |
| `task_completed` | Completed | Green (bg-green-100 dark:bg-green-900/50) |
| `task_updated` | Updated | Yellow (bg-yellow-100 dark:bg-yellow-900/50) |
| `task_deleted` | Deleted | Red (bg-red-100 dark:bg-red-900/50) |
| `task_moved` | Moved | Blue (bg-blue-100 dark:bg-blue-900/50) |

**Status Badges** (when task status changed):
- Shown only when `metadata.task_status` is present
- Uses existing task status badge component (Inbox/Up Next/In Progress/In Review/Done/Rejected)

### Display Format

**Task with status change:**
```
[🔦 Lanturn] [Updated] [In Progress]
Fix bug in login flow (#640)
                                      1h ago
```

**Task creation:**
```
[🔦 Lanturn] [Created] [Inbox]
Setup authentication system (#642)
                                      5m ago
```

**Task completion:**
```
[🔦 Lanturn] [Completed] [Done]
[MODOP] Proxmox LXC automation script (#641)
                                      2m ago
```

**Task deletion (no status badge):**
```
[🔦 Lanturn] [Deleted]
Old duplicate task
                                      3h ago
```

### Message Formatting

Strip these prefixes from task messages:
- "Completed task: "
- "Created task: "
- "Updated task: "
- "Deleted task: "
- "Moved task: "
- Any other "Task " or "task " action prefixes

Preserve:
- Task references: (#123)
- Task descriptions
- Board/status change details (e.g., "from Backlog to Sprint 1")

## Implementation Notes

**File to modify:** `frontend/src/components/ActivityFeed.tsx`

**Key changes:**
1. Create `getTaskActionBadge()` function to map activity type → badge
2. Create `stripTaskPrefix()` function to clean message text
3. Update `ActivityItem` component's task badge section (lines 279-287) to:
   - Show action badge for all task activities
   - Show status badge when `metadata.task_status` exists
   - Apply `stripTaskPrefix()` to task messages

**No backend changes needed** - all formatting is frontend-only.

## Visual Consistency

This change makes the Tasks tab visually consistent with the Agents tab:
- Same badge layout (actor + action/status + optional status)
- Same clean message format (no redundant prefixes)
- Same visual scanning pattern (badges → message → timestamp)
