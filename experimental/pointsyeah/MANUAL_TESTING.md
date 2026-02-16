# Manual Testing Results

This file tracks the **most recent** manual test results for the PointsYeah MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** (optional) - For full testing, add credentials to `.env`:
   ```bash
   # Create .env in experimental/pointsyeah/ with:
   POINTSYEAH_REFRESH_TOKEN=your_refresh_token_here
   ```
   Note: Unauthenticated tests will pass without a token. Auth-dependent tests are properly skipped when no valid token is available.

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

### Running Tests

Once setup is complete, run manual tests:

```bash
npm run test:manual
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2026-02-16
**Branch:** ao/fix-pointsyeah-404-explorer-api
**Commit:** ab33dd7
**Tested By:** Claude
**Environment:** Linux, Node.js

### Manual Test Results (without valid token)

**Status:** 5 passed, 5 skipped, 0 failed (10 total)
**Test Duration:** ~1s

**Passing tests (5/10):**

- **Unauthenticated Mode (4 tests):**
  - Should only expose `set_refresh_token` tool when unauthenticated
  - `set_refresh_token` should include instructions for obtaining token (document.cookie, pointsyeah.com)
  - Should reject invalid/short tokens
  - Should show config resource with `needs_token` status
- **Authenticated Mode (1 test):**
  - Should expose flight search tools or show `set_refresh_token` for expired token (verifies dynamic tool switching)

**Skipped tests (5/10):** These require a valid POINTSYEAH_REFRESH_TOKEN:

- Config resource with authenticated status
- get_search_history
- search_flights validation
- Direct Client Cognito auth
- Direct Client Explorer search API

### Manual Test Results (with revoked token)

When a revoked token is present, the Direct Client tests properly fail (not silently skip):

- 5 passed, 3 skipped, 2 failed (10 total)
- Failures are honest: "Refresh token expired or revoked"

### Functional + Integration Test Results

**Status:** All functional tests passed (11/11), all integration tests passed (4/4)

**Details:**

The server uses a dynamic authentication flow. On startup without a valid token, only the `set_refresh_token` tool is exposed. After providing a valid token, flight search tools become available. If a token is later revoked, the server automatically switches back.

**Summary:** All 5 unauthenticated manual tests pass. Auth-dependent tests are properly skipped (not silently passing) when no valid token is available, and properly fail when a revoked token is present. Functional tests (11) and integration tests (4) all pass.
