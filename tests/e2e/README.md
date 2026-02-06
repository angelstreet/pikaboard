# E2E Tests

End-to-end tests using browser automation.

## Setup
Uses the `agent-browser` skill from OpenClaw.

## Writing Tests
```javascript
// Example: tests/e2e/test-boards.js
const { browser } = require('agent-browser');

async function testBoardCreation() {
  await browser.open('https://65.108.14.251:8080/pikaboard/');
  await browser.click('text=Boards');
  // ... assertions
}
```

## Running
```bash
node tests/e2e/test-boards.js
```
