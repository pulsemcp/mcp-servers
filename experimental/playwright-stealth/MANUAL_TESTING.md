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

**Test Date:** 2026-01-08
**Branch:** claude/playwright-stealth-resource-storage
**Commit:** 5bb4ca4
**Tested By:** Claude

### Summary

**Overall:** 20 tests pass (100%)

All manual tests with real browsers pass, including:

- Core Playwright functionality (navigation, screenshots, state management)
- Stealth mode anti-bot protection tests
- **NEW: Screenshot resource storage tests**

### Test Cases Status

| Test Suite                     | Tests | Status  |
| ------------------------------ | ----- | ------- |
| Playwright Client Manual Tests | 13    | ✅ Pass |
| Screenshot Resource Storage    | 7     | ✅ Pass |

### Detailed Results

#### Playwright Client Tests (13 tests)

| Tool               | Functional Test | Integration Test | Manual Test |
| ------------------ | --------------- | ---------------- | ----------- |
| browser_execute    | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_screenshot | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_get_state  | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_close      | ✅ Pass         | ✅ Pass          | ✅ Pass     |

#### Screenshot Resource Storage Tests (7 tests) - NEW

| Test Case                                    | Result  | Details                                         |
| -------------------------------------------- | ------- | ----------------------------------------------- |
| Save real screenshot to storage              | ✅ Pass | Screenshot saved as PNG file (~20KB)            |
| Save full-page screenshot to storage         | ✅ Pass | Metadata correctly records fullPage: true       |
| Read back saved screenshot                   | ✅ Pass | Base64 content matches original                 |
| List saved screenshots                       | ✅ Pass | Returns resources sorted by timestamp (desc)    |
| Delete screenshot                            | ✅ Pass | File and metadata removed from disk             |
| Storage factory uses SCREENSHOT_STORAGE_PATH | ✅ Pass | Environment variable correctly configures path  |
| Capture screenshot after navigation          | ✅ Pass | Metadata captures correct pageUrl and pageTitle |

#### Anti-Bot Protection Test Results

| Test Case                             | Result  | Details                                                       |
| ------------------------------------- | ------- | ------------------------------------------------------------- |
| claude.ai login WITHOUT stealth mode  | Blocked | `isBlocked: true`, `hasLoginForm: false` - protection active  |
| claude.ai login WITH stealth mode     | Success | `isBlocked: true` (cf- markers), `hasLoginForm: true` - works |
| bot.sannysoft.com webdriver detection | Pass    | Webdriver not detected with stealth mode                      |

### Key Findings

1. **Screenshot resource storage works correctly**: Screenshots are saved to filesystem with proper metadata (pageUrl, pageTitle, timestamp, fullPage)
2. **File format verified**: Screenshots saved as valid PNG files (~20KB for example.com)
3. **Metadata persistence verified**: JSON metadata files created alongside PNG files
4. **SCREENSHOT_STORAGE_PATH env var works**: Factory correctly uses custom storage path
5. **Stealth mode effectively bypasses anti-bot protection**: The claude.ai login page shows the login form with stealth mode
6. **WebDriver detection avoided**: bot.sannysoft.com shows webdriver as "not found" when using stealth mode

### Notes

- Functional tests verify tool handler behavior with mocked Playwright client
- Integration tests verify MCP protocol compliance
- Manual tests use real Chromium browser with actual network requests
- Stealth mode adds ~100ms overhead for plugin initialization
- Screenshot storage tests verified with real browser screenshots (~20KB PNG files)
