# PikaBoard Testing Requirements

> **CRITICAL:** All changes must pass tests before moving to `in_review`. No exceptions.

## Test Pyramid

```
    /\
   /  \     E2E Tests (Browser)
  /----\    Slow, comprehensive
 /      \
/--------\  API Tests (Integration)
            Medium speed, endpoint coverage
/----------\\nUnit Tests (Backend)
Fast, focused
```

## Required Test Coverage

### 1. Unit Tests (Backend)

**Location:** `backend/src/**/*.test.ts`

**Must cover:**
- Utility functions
- Data transformations
- Business logic
- Database queries

**Run:**
```bash
cd backend && npm run test
```

**Threshold:** 100% of new utility functions must have tests.

### 2. API Tests

**Location:** `tests/api/test-*.sh`

**Must cover:**
- All new endpoints
- CRUD operations
- Authentication/authorization
- Error handling

**Run:**
```bash
bash tests/api/run.sh
```

**For new endpoints, add:**
```bash
# tests/api/test-<feature>.sh
echo "GET /api/new-feature"
response=$(api GET "/new-feature")
assert_status "Returns 200" 200 "$?"
assert_contains "Has data" "$response" "key"
```

### 3. E2E Tests

**Location:** `tests/e2e/specs/*.spec.js`

**Must cover:**
- Critical user workflows
- Cross-browser compatibility
- Mobile responsiveness

**Run:**
```bash
bash tests/e2e/run.sh
```

**For new features, add:**
```javascript
// tests/e2e/specs/<feature>.spec.js
test('should complete workflow', async ({ page }) => {
  await login(page);
  await page.goto('/pikaboard/feature');
  // Test steps
});
```

## Pre-Review Checklist

Before moving any task to `in_review`, you **MUST**:

```bash
./scripts/pre-review-check.sh
```

### What it checks:

| Check | Failure Action |
|-------|---------------|
| Git branch is `dev` | Switch to dev branch |
| No uncommitted changes | Commit all changes |
| Commits pushed | `git push origin dev` |
| Backend builds | Fix build errors |
| Frontend builds | Fix build errors |
| Unit tests pass | Fix failing tests |
| API tests pass | Fix endpoint issues |
| Linting passes | `npm run format` |

## CI/CD Enforcement

GitHub Actions runs on every push:

```yaml
# .github/workflows/ci.yml
- Lint checks
- Unit tests  
- API tests
- Build verification
- E2E tests (on main PRs)
```

**A failing CI blocks merge to main.**

## Testing Philosophy

1. **Test behavior, not implementation**
   - Good: `expect(result).toBe(42)`
   - Bad: `expect(function.callCount).toBe(1)`

2. **One assertion per test** (ideally)
   - Tests should fail for one reason only

3. **Fast feedback loop**
   - Unit tests < 100ms each
   - Full suite < 2 minutes locally

4. **Deterministic tests**
   - No randomness
   - No time dependencies
   - No external services in unit tests

## Test Data

### Unit Tests
- Use in-memory SQLite
- Seed fresh data per test
- Clean up after each test

### API Tests
- Test against running dev server
- Use test-specific board/task IDs
- Clean up created resources

### E2E Tests
- Authenticate with token
- Create isolated test data
- Screenshots on failure

## Common Patterns

### Testing API Endpoints
```bash
# Create
created=$(api POST "/tasks" '{"name":"Test"}')
TASK_ID=$(echo "$created" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Read
api GET "/tasks/$TASK_ID"

# Update
api PATCH "/tasks/$TASK_ID" '{"status":"done"}'

# Delete
api DELETE "/tasks/$TASK_ID"
```

### Testing React Components
```javascript
test('button click increments', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Increment');
  await expect(page.locator('.count')).toHaveText('1');
});
```

## Emergency Procedures

If tests are broken on `dev`:

1. **Don't merge to main**
2. Fix tests in a new branch
3. PR to `dev` with test fixes only
4. Re-run pre-review check

## Questions?

Check existing tests in:
- `backend/src/**/*.test.ts` for unit test examples
- `tests/api/test-*.sh` for API test examples  
- `tests/e2e/specs/*.spec.js` for E2E test examples
