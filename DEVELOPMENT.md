# PikaBoard Development Workflow

## Branch Strategy

```
main   ← stable production (DO NOT push directly)
  │
  └── dev ← all active development happens here
```

## Rules

1. **All changes go to `dev` branch only**
2. **Never push directly to `main`**
3. **Jo reviews on `/pikaboard-dev/`**
4. **Only merge to `main` when Jo explicitly approves**

## Deployment

### Dev (for review)
```bash
./scripts/deploy-dev.sh
```
- Deploys `dev` branch to https://65.108.14.251:8080/pikaboard-dev/
- Footer shows: `v0.1.0 (dev) • {commit}`

### Production (after approval)
```bash
./scripts/deploy-prod.sh
```
- Deploys `main` branch to https://65.108.14.251:8080/pikaboard/
- Footer shows: `v0.1.0 (main) • {commit}`

## Merge Process

When Jo says "merge to main":
```bash
git checkout main
git merge dev
git push origin main
./scripts/deploy-prod.sh
```

## Environment Toggle

Both prod and dev have a toggle button in the header to switch between environments.

## Sub-Agent Instructions

If you're a sub-agent working on PikaBoard:
1. Always work on `dev` branch
2. Commit and push to `dev` only
3. Run `./scripts/deploy-dev.sh` to deploy for review
4. DO NOT touch `main` branch
