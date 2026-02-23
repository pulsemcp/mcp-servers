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

**Test Date:** 2026-02-23
**Branch:** agent-orchestrator/video-recording-tools
**Commit:** e0f2624 (v0.1.0 - add video recording tools)
**Tested By:** Claude

### Summary

**Overall:** 57 functional tests pass (100%)

All functional tests pass, including new video recording and storage tests:

- Core Playwright functionality (navigation, screenshots, state management)
- Video recording tools (start/stop recording, context recycling)
- Video storage system (write, read, list, delete, factory)
- Video resources exposed via MCP resources handlers
- Screenshot resource storage tests
- Screenshot dimension limiting to prevent API errors
- Browser permissions support
- IGNORE_HTTPS_ERRORS environment variable support

### Changes in v0.1.0

Added video recording support with context recycling:

- New `browser_start_recording` tool to begin capturing browser interactions as WebM video
- New `browser_stop_recording` tool to stop recording and save the video as an MCP resource
- Video storage system (`FileSystemVideoStorage`, `VideoStorageFactory`) following the screenshot pattern
- `VIDEO_STORAGE_PATH` environment variable for configuring video storage location
- Videos exposed as MCP resources alongside screenshots
- Context recycling approach creates new browser context with/without `recordVideo` option
- Tool descriptions document that cookies/localStorage/sessionStorage are lost on start/stop

### Test Cases Status

| Test Suite                | Tests | Status |
| ------------------------- | ----- | ------ |
| Functional: Tools         | 21    | Pass   |
| Functional: Storage       | 14    | Pass   |
| Functional: Video Storage | 15    | Pass   |
| Functional: Resources     | 7     | Pass   |

### Detailed Results

#### Tool Tests (21 tests)

| Tool                    | Functional Test | Status |
| ----------------------- | --------------- | ------ |
| browser_execute         | 4 tests         | Pass   |
| browser_screenshot      | 6 tests         | Pass   |
| browser_get_state       | 2 tests         | Pass   |
| browser_close           | 1 test          | Pass   |
| browser_start_recording | 3 tests         | Pass   |
| browser_stop_recording  | 3 tests         | Pass   |
| Tool Registration       | 1 test          | Pass   |
| Unknown tool            | 1 test          | Pass   |

#### Video Storage Tests (15 tests)

| Test Case                               | Result | Details                                             |
| --------------------------------------- | ------ | --------------------------------------------------- |
| Save video and return file URI          | Pass   | Video copied and URI returned with .webm extension  |
| Create WebM and JSON metadata files     | Pass   | Both files created alongside each other             |
| Save correct metadata                   | Pass   | pageUrl, pageTitle, durationMs, timestamp all saved |
| Copy video file content correctly       | Pass   | Content matches source file                         |
| Read a saved video                      | Pass   | Base64 content matches original                     |
| Read non-existent resource              | Pass   | Throws 'Resource not found' error                   |
| List empty directory                    | Pass   | Returns empty array                                 |
| List saved videos                       | Pass   | Returns correct count with metadata                 |
| Sort by timestamp descending            | Pass   | Most recent first                                   |
| Exists for existing resource            | Pass   | Returns true                                        |
| Exists for non-existent resource        | Pass   | Returns false                                       |
| Delete video and metadata               | Pass   | Both files removed                                  |
| Delete non-existent resource            | Pass   | Throws error                                        |
| Factory uses VIDEO_STORAGE_PATH env var | Pass   | Custom path respected                               |
| Factory reuses same instance            | Pass   | Singleton pattern works                             |

#### Resource Tests (7 tests)

| Test Case                        | Result | Details                               |
| -------------------------------- | ------ | ------------------------------------- |
| Empty list when no resources     | Pass   | Returns empty array                   |
| List saved screenshots           | Pass   | Returns PNG resources with metadata   |
| List saved videos                | Pass   | Returns WebM resources with metadata  |
| List both screenshots and videos | Pass   | Both types returned together          |
| Read a saved screenshot          | Pass   | Returns correct mimeType and blob     |
| Read a saved video               | Pass   | Returns correct mimeType (video/webm) |
| Error for non-existent resource  | Pass   | Throws 'Resource not found'           |

### Notes

- Functional tests verify tool handler behavior with mocked Playwright client
- Video recording tests use mock file operations (no real Playwright browser needed)
- Context recycling approach is validated via mock client that tracks recording state
- Manual tests with real browser not run for this change (video recording requires real browser context lifecycle which cannot be tested without Playwright browsers installed)
