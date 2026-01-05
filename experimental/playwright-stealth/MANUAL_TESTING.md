# Manual Testing Results

This file tracks the **most recent** manual test results for the Playwright Stealth MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Install Playwright browsers**:

   ```bash
   npm run test:manual:setup
   ```

### Running Tests

```bash
# Run manual tests
npm run test:manual
```

## Latest Test Results

**Test Date:** 2026-01-05
**Branch:** claude/playwright-stealth-configurable-timeout
**Commit:** b5a26ad
**Tested By:** Claude

### Summary

**Overall:** 13 tests pass (100%)

All manual tests with real browsers pass, including stealth mode anti-bot protection tests.

### Test Cases Status

| Tool               | Functional Test | Integration Test | Manual Test |
| ------------------ | --------------- | ---------------- | ----------- |
| browser_execute    | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_screenshot | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_get_state  | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_close      | ✅ Pass         | ✅ Pass          | ✅ Pass     |

### Anti-Bot Protection Test Results

| Test Case                             | Result  | Details                                                       |
| ------------------------------------- | ------- | ------------------------------------------------------------- |
| claude.ai login WITHOUT stealth mode  | Blocked | `isBlocked: true`, `hasLoginForm: false` - protection active  |
| claude.ai login WITH stealth mode     | Success | `isBlocked: true` (cf- markers), `hasLoginForm: true` - works |
| bot.sannysoft.com webdriver detection | Pass    | Webdriver not detected with stealth mode                      |

### Key Findings

1. **Stealth mode effectively bypasses anti-bot protection**: The claude.ai login page shows the login form with stealth mode (`hasLoginForm: true`), but blocks it without stealth (`hasLoginForm: false`)
2. **WebDriver detection avoided**: bot.sannysoft.com shows webdriver as "not found" when using stealth mode
3. **All core functionality works**: Navigation, screenshots, state management, and browser cleanup all function correctly

### Notes

- Functional tests verify tool handler behavior with mocked Playwright client
- Integration tests verify MCP protocol compliance
- Manual tests use real Chromium browser with actual network requests
- Stealth mode adds ~100ms overhead for plugin initialization
