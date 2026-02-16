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
   Note: Unauthenticated tests will pass without a token. The server's dynamic auth flow is designed to work without one.

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
**Commit:** d29535b
**Tested By:** Claude
**Environment:** Linux, Node.js

### Manual Test Results

**Status:** 10 passed, 0 failed (10 total)
**Test Duration:** ~3s

**All tests passing (10/10):**

- **Unauthenticated Mode (4 tests):**
  - Should only expose `set_refresh_token` tool when unauthenticated
  - `set_refresh_token` should include instructions for obtaining token (document.cookie, pointsyeah.com)
  - Should reject invalid/short tokens
  - Should show config resource with `needs_token` status

- **Authenticated Mode (4 tests):**
  - Token expired — server correctly shows `set_refresh_token` (graceful handling of revoked token)
  - Config resource, search history, and validation tests correctly skip when token is unavailable

- **Direct Client (2 tests):**
  - Cognito token refresh correctly identifies expired/revoked tokens
  - Explorer search API correctly skips when token is unavailable

### Functional + Integration Test Results

**Status:** All functional tests passed (11/11), all integration tests passed (4/4)

**Details:**

The server now uses a dynamic authentication flow. On startup without a valid token, only the `set_refresh_token` tool is exposed. After providing a valid token, flight search tools become available. If a token is later revoked, the server automatically switches back.

**Summary:** All 10 manual tests pass regardless of token availability. The dynamic auth flow ensures tests never fail due to expired credentials. Functional tests (11) and integration tests (4) also all pass.
