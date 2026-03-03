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

**Test Date:** 2026-03-03
**Branch:** agent-orchestrator/element-screenshots-and-session-state
**Commit:** 5f4fe1b (element/region screenshots + session state preservation)
**Tested By:** Claude

### Summary

**Overall:** 29 manual tests passed, 4 skipped (proxy tests require credentials), 3 test files

All manual tests pass with real browser, including:

- Core Playwright functionality (navigation, screenshots, state management)
- Screenshot dimension limiting (clipping large full-page screenshots)
- Stealth mode (webdriver detection bypass, bot protection tests)
- Error handling (navigation errors, execution timeouts)
- Screenshot resource storage (capture, save, list, read)
- Video recording with session state preservation (start, perform actions, stop, resource link)
- Video resources (list, read back saved video)
- Recording while already recording (auto-save previous)
- Anti-bot protection (claude.ai login with/without stealth)

### Changes Tested

- **Element screenshots**: New `selector` parameter for `browser_screenshot` captures specific elements by CSS selector
- **Region screenshots**: New `clip` parameter for `browser_screenshot` captures rectangular page regions
- **Session state preservation**: Cookies, localStorage, and sessionStorage preserved across video recording start/stop via Playwright's `storageState` API
- **Test isolation fix**: `resource-storage.manual.test.ts` now sets `VIDEO_STORAGE_PATH` to avoid cross-test contamination

### Test Cases Status

| Test Suite                          | Tests | Status           |
| ----------------------------------- | ----- | ---------------- |
| Manual: Playwright Client           | 14    | Pass (4 skipped) |
| Manual: Screenshot Resource Storage | 7     | Pass             |
| Manual: Video Recording             | 8     | Pass             |

### Detailed Results

#### Playwright Client Manual Tests (14 tests, 4 skipped)

| Test                                                      | Result  | Details                                           |
| --------------------------------------------------------- | ------- | ------------------------------------------------- |
| Standard Mode: navigate and get title                     | Pass    | example.com title returned correctly              |
| Screenshot Dimension Limiting: clip oversized screenshots | Pass    | Warning shown for 10000px page, clipped to 8000px |
| Screenshot Dimension Limiting: no clip within limits      | Pass    | No warning for normal page                        |
| Stealth Mode: navigate with stealth enabled               | Pass    | example.com loaded correctly                      |
| Stealth Mode: webdriver detection check                   | Pass    | Webdriver not detected on bot.sannysoft.com       |
| Anti-Bot: claude.ai WITHOUT stealth                       | Pass    | Blocked (isBlocked=true)                          |
| Anti-Bot: claude.ai WITH stealth                          | Pass    | Got through (hasLoginForm=true)                   |
| Error Handling: navigation errors                         | Pass    | Error returned for non-existent domain            |
| Error Handling: execution timeout                         | Pass    | Timeout error after 1000ms                        |
| Proxy: connect through proxy                              | Skipped | No proxy credentials configured                   |
| Proxy: verify proxy IP differs                            | Skipped | No proxy credentials configured                   |
| Proxy: proxy + stealth combined                           | Skipped | No proxy credentials configured                   |
| Proxy: config shows proxy enabled                         | Skipped | No proxy credentials configured                   |

#### Screenshot Resource Storage Manual Tests (7 tests)

| Test                                            | Result | Details                                    |
| ----------------------------------------------- | ------ | ------------------------------------------ |
| Take viewport screenshot and return image data  | Pass   | 27572 chars base64, saved to storage       |
| Take full-page screenshot and return image data | Pass   | Screenshot saved successfully              |
| Save screenshot with saveOnly mode              | Pass   | Only resource_link URI returned            |
| Save screenshot with saveAndReturn mode         | Pass   | Both image data and resource_link returned |
| List saved screenshots as resources             | Pass   | 5 screenshot resources listed              |
| Read back a saved screenshot resource           | Pass   | Blob length matches original (27572)       |
| Capture screenshot after navigation             | Pass   | Screenshot of httpbin.org captured         |

#### Video Recording Manual Tests (8 tests)

| Test                                                          | Result | Details                                       |
| ------------------------------------------------------------- | ------ | --------------------------------------------- |
| Start recording successfully                                  | Pass   | "Recording started", session state preserved  |
| Perform actions while recording                               | Pass   | page.title() returns "Example Domain"         |
| Stop recording and return video resource link                 | Pass   | resource_link with file:// URI to .webm file  |
| Error when stopping while not recording                       | Pass   | "Not currently recording" error returned      |
| Execute after stopping recording                              | Pass   | Browser still works, returns "Example Domain" |
| List video recordings as resources                            | Pass   | 1 video resource found with .webm extension   |
| Read back a saved video resource                              | Pass   | 41356 chars base64 blob returned              |
| Save previous recording when starting new one while recording | Pass   | Previous recording auto-saved, second started |

### Notes

- All tests run with real Chromium browser in headless mode
- Video recording tests verify real browser context recycling with session state preservation
- Video files are real WebM recordings saved to filesystem
- Proxy tests skipped due to no proxy credentials configured
- `PLAYWRIGHT_BROWSERS_PATH` environment variable properly propagated to all spawned MCP server processes
- Session state preservation messages confirmed: "Session state (cookies, localStorage) has been preserved where possible"
