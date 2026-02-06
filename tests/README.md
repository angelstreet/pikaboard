# PikaBoard Tests

## Structure
```
tests/
├── api/       # API endpoint tests (curl-based, fast)
├── e2e/       # End-to-end tests (agent-browser)
└── README.md
```

## Running Tests

### API Tests
```bash
./tests/api/run.sh
```

### E2E Tests
```bash
./tests/e2e/run.sh
```

## Workflow

1. **Before `in_review`**: All tests must pass
2. **New feature** = new test (no exceptions)
3. **Bug fix** = regression test added

## Adding Tests

### API Test Template
```bash
# tests/api/test-<feature>.sh
source ./tests/api/helpers.sh
test_endpoint "GET /api/tasks" 200
test_json_field ".tasks" "array"
```

### E2E Test Template
Uses agent-browser skill for browser automation.
