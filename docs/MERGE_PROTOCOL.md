# Merge Protocol

## Golden Rules

1. **Never push directly to `main`** — always via PR
2. **Never merge without pulling first** — avoid conflicts
3. **Never trust "it builds"** — verify the feature works

## Branch Structure

```
main      ← Production (protected)
  └── dev     ← Integration branch
        └── feature/*  ← Agent work branches
```

## Workflow

### For Sub-Agents (Bulbi, Evoli, etc.)

1. Create feature branch from `dev`: `git checkout -b feature/task-123`
2. Do work, commit with clear messages
3. Push and create PR to `dev`
4. Pika reviews/merges to `dev`

### For Pika (Merging dev → main)

1. `git checkout dev && git pull origin dev`
2. `git checkout main && git pull origin main`
3. `git merge dev --no-ff` (keeps merge commit for history)
4. **Test the build**: `npm run build`
5. **Verify features work** — not just "no errors"
6. `git push origin main`

### Pre-Merge Checklist

- [ ] Pulled latest from both branches
- [ ] No uncommitted local changes
- [ ] Build passes
- [ ] Feature actually works (tested in browser)
- [ ] No console errors

## Recovery

If merge goes wrong:
```bash
git reset --hard HEAD~1   # Undo last commit (before push)
git push --force          # Only if already pushed (dangerous!)
```

Better: use `git revert` to preserve history.

## Branch Protection (Recommended)

```bash
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  -f required_status_checks='{"strict":true,"contexts":[]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":1}'
```

---

*Last updated: 2026-02-06*
