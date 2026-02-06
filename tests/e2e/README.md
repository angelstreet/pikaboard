# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/).

## Setup

```bash
cd tests/e2e
npm install
npx playwright install chromium
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (for debugging)
cd tests/e2e && npm run test:ui

# Run specific test file
npx playwright test specs/auth.spec.js

# Run in debug mode
npx playwright test --debug
```

## Test Structure

```
tests/e2e/
├── helpers/
│   └── auth.js          # Authentication utilities
├── specs/
│   ├── auth.spec.js     # Login/logout flows
│   ├── boards.spec.js   # Board management
│   ├── tasks.spec.js    # Task CRUD operations
│   └── kanban.spec.js   # Kanban workflow
├── playwright.config.js # Playwright configuration
└── package.json         # Dependencies
```

## Writing Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/auth');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/pikaboard/');
    await expect(page.locator('h1')).toContainText('PikaBoard');
  });
});
```

### Authentication

All tests should use the `login()` helper which sets the auth token:

```javascript
const { login } = require('../helpers/auth');

// In your test:
await login(page);
```

### Selectors

Use accessible selectors when possible:

```javascript
// Good - accessible
await page.click('text=Add Task');
await page.fill('[placeholder="Task name"]', 'My Task');
await page.click('role=button[name="Save"]');

// Avoid - fragile
await page.click('.btn-primary');
await page.fill('#input-123', 'My Task');
```

### Assertions

```javascript
// Text content
await expect(page.locator('h1')).toContainText('Boards');

// Visibility
await expect(page.locator('.task-card')).toBeVisible();

// URL
await expect(page).toHaveURL(/\/boards\/\d+/);

// Count
await expect(page.locator('.task-card')).toHaveCount(5);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_BASE_URL` | Base URL for tests | `http://localhost:80` |
| `PIKABOARD_TOKEN` | Auth token | (built-in) |
| `CI` | Running in CI mode | `false` |

## Debugging

1. **UI Mode**: `npm run test:ui` - Interactive test runner
2. **Debug Mode**: `npx playwright test --debug` - Step through tests
3. **Trace Viewer**: Check `playwright-report/` after failed runs
4. **Screenshots**: Auto-captured on failure in `test-results/`

## CI/CD

E2E tests run on GitHub Actions for:
- Pull requests to `main`
- Pushes to `main`

Browsers tested:
- Chromium (desktop)
- Firefox (desktop)
- WebKit/Safari (desktop)
- Mobile Chrome

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use beforeEach** - Login in `beforeEach`, not in each test
3. **Prefer visible selectors** - Use text/role over CSS classes
4. **Add data-testid** when needed for stable selectors
5. **Clean up** - Remove test data in `afterEach` if needed

## Troubleshooting

### Tests fail in CI but pass locally
- Check `E2E_BASE_URL` is correct
- Verify server is running before tests
- Check for timing issues (add `await page.waitForLoadState()`)

### Browser installation issues
```bash
npx playwright install --with-deps
```

### Tests timeout
- Increase timeout in `playwright.config.js`
- Check if server is responding: `curl $E2E_BASE_URL/health`
