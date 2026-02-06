# PikaBoard Testing Guide

## Overview

All code changes **MUST** pass tests before moving to `in_review`. This is enforced via:
1. The `./scripts/pre-review-check.sh` script
2. CI/CD pipeline on GitHub Actions

## Test Structure

```
tests/
├── api/              # API endpoint tests (curl-based, fast)
├── e2e/              # End-to-end tests (Playwright)
│   ├── helpers/      # Test utilities
│   ├── specs/        # Test specifications
│   └── package.json  # E2E-specific dependencies
├── README.md         # This file
└── TESTING.md        # Detailed testing requirements
```

## Quick Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Backend unit tests (Vitest)
npm run test:api       # API integration tests
npm run test:e2e       # E2E browser tests
npm run test:ci        # CI-friendly test suite (no E2E)

# Pre-review check (MUST pass before in_review)
./scripts/pre-review-check.sh
```

## Test Requirements by Change Type

| Change Type | Required Tests |
|-------------|---------------|
| Backend API changes | Unit tests + API tests |
| Frontend UI changes | E2E tests + visual check |
| Bug fix | Regression test added |
| New feature | Unit + API + E2E tests |
| Refactoring | All existing tests must pass |

## Before Moving to `in_review`

You **MUST** run the pre-review check:

```bash
./scripts/pre-review-check.sh
```

This verifies:
- ✅ On `dev` branch with clean commits
- ✅ Code builds without errors
- ✅ All unit tests pass
- ✅ All API tests pass
- ✅ Linting passes

## CI/CD Pipeline

Tests run automatically on:
- Every push to `dev` or `main`
- Every pull request

The pipeline includes:
1. Lint checks
2. Unit tests
3. Build verification
4. E2E tests (on PRs to main)

## Adding New Tests

### Unit Tests (Backend)

```typescript
// backend/src/utils/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './example';

describe('myFunction', () => {
  it('should return correct result', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### API Tests

Add a new file in `tests/api/`:

```bash
# tests/api/test-feature.sh
source "$(dirname "$0")/helpers.sh"

echo "📋 Testing Feature API"
echo "========================"

response=$(api GET "/new-endpoint")
assert_contains "Returns data" "$response" "expected_key"

summary
```

### E2E Tests

Add a new file in `tests/e2e/specs/`:

```javascript
// tests/e2e/specs/feature.spec.js
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should work correctly', async ({ page }) => {
    await page.goto('/pikaboard/feature');
    await expect(page.locator('h1')).toContainText('Feature');
  });
});
```

## Debugging Failed Tests

### Unit Tests
```bash
cd backend
npm run test:watch    # Watch mode for debugging
```

### API Tests
```bash
# Run with verbose output
bash tests/api/run.sh 2>&1 | tee api-test.log

# Test specific endpoint
curl -s http://localhost:3001/api/health
```

### E2E Tests
```bash
cd tests/e2e
npm run test:ui        # Interactive UI mode
npm run test:debug     # Debug mode with inspector

# View report after run
npm run report
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PIKABOARD_TOKEN` | API auth token | (in helpers) |
| `E2E_BASE_URL` | E2E test target | http://localhost:80 |
| `NODE_ENV` | Test environment | test |
