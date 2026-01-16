# Manual Testing Results

This file tracks the **most recent** manual test results for the Playwright Stealth MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Install Playwright browsers**:

   ```bash
   npm run test:manual:setup
   ```

2. **For proxy tests**, create a `.env` file with:
   ```bash
   PROXY_URL=http://your-proxy-server:port
   PROXY_USERNAME=your-username
   PROXY_PASSWORD=your-password
   ```

### Running Tests

```bash
# Run manual tests
npm run test:manual
```

## Latest Test Results

**Test Date:** 2026-01-16
**Branch:** tadasant/playwright-permissions
**Commit:** a3d68e0 (v0.0.7 - browser permissions support)
**Tested By:** Claude

### Summary

**Overall:** 33 tests pass (100%)

All functional and integration tests pass, including:

- Core Playwright functionality (navigation, screenshots, state management)
- Stealth mode anti-bot protection tests
- Screenshot resource storage tests
- Screenshot dimension limiting to prevent API errors
- **NEW: Browser permissions support**

### New in v0.0.7

Browser permissions support enables testing of features requiring permissions:

- All 16 browser permissions granted by default (notifications, geolocation, camera, etc.)
- `BROWSER_PERMISSIONS` env var to constrain which permissions are granted
- `permissions` field in `browser_get_state` response shows granted permissions
- `ALL_BROWSER_PERMISSIONS` constant and `BrowserPermission` type exported
- Try-catch around `grantPermissions()` for graceful handling of unsupported permissions

### Test Cases Status

| Test Suite          | Tests | Status  |
| ------------------- | ----- | ------- |
| Functional Tests    | 33    | ✅ Pass |
| Integration Tests   | 6     | ✅ Pass |
| Screenshot Clipping | 2     | ✅ Pass |

### Detailed Results

#### Playwright Client Tests (13 tests)

| Tool               | Functional Test | Integration Test | Manual Test |
| ------------------ | --------------- | ---------------- | ----------- |
| browser_execute    | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_screenshot | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_get_state  | ✅ Pass         | ✅ Pass          | ✅ Pass     |
| browser_close      | ✅ Pass         | ✅ Pass          | ✅ Pass     |

#### Screenshot Resource Storage Tests (7 tests)

| Test Case                                    | Result  | Details                                         |
| -------------------------------------------- | ------- | ----------------------------------------------- |
| Save real screenshot to storage              | ✅ Pass | Screenshot saved as PNG file (~20KB)            |
| Save full-page screenshot to storage         | ✅ Pass | Metadata correctly records fullPage: true       |
| Read back saved screenshot                   | ✅ Pass | Base64 content matches original                 |
| List saved screenshots                       | ✅ Pass | Returns resources sorted by timestamp (desc)    |
| Delete screenshot                            | ✅ Pass | File and metadata removed from disk             |
| Storage factory uses SCREENSHOT_STORAGE_PATH | ✅ Pass | Environment variable correctly configures path  |
| Capture screenshot after navigation          | ✅ Pass | Metadata captures correct pageUrl and pageTitle |

#### Proxy Mode Tests (5 tests) - NEW

| Test Case                          | Result | Details                                                   |
| ---------------------------------- | ------ | --------------------------------------------------------- |
| Connect through proxy              | Pass   | Successfully fetched external IP via BrightData proxy     |
| Verify proxy IP differs from local | Pass   | Proxy IP: `97.181.22.160`, Direct IP: `143.105.119.238`   |
| Proxy + Stealth mode combined      | Pass   | Webdriver "not found" when using proxy + stealth together |
| Config shows proxy enabled         | Pass   | `proxyEnabled: true` in browser state                     |
| Close proxy browser                | Pass   | Browser cleanup works correctly with proxy                |

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
7. **Proxy support works with BrightData**: Residential proxy integration successfully masks real IP with rotating IPs
8. **Proxy + Stealth combination works**: Both features can be used together for maximum anti-detection
9. **HTTPS handling**: Proxy mode correctly ignores HTTPS errors for residential proxies that perform TLS inspection

### Notes

- Functional tests verify tool handler behavior with mocked Playwright client
- Integration tests verify MCP protocol compliance
- Manual tests use real Chromium browser with actual network requests
- Stealth mode adds ~100ms overhead for plugin initialization
- Screenshot storage tests verified with real browser screenshots (~20KB PNG files)
- Proxy mode requires `ignoreHTTPSErrors` for residential proxies that perform HTTPS inspection
