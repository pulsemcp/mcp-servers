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
   Note: Unauthenticated tests always run. Auth-dependent tests are properly skipped (via `ctx.skip()`) when no valid token is available.

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

**Test Date:** 2026-02-22
**Branch:** tadasant/fix-pointsyeah-null-data-envelope
**Commit:** 5212cf5
**Tested By:** Claude
**Environment:** Linux, Node.js

### Manual Test Results

**Status:** 6 passed, 4 skipped, 0 failed (10 total)
**Test Duration:** ~3s

Refresh token was revoked at time of manual test run. All 6 unauthenticated tests passed; 4 auth-dependent tests were properly skipped via `ctx.skip()`.

**Passing tests (6/6):**

- **Unauthenticated Mode (5 tests):**
  - Should expose all tools even when unauthenticated (3 tools: search_flights, get_search_history, set_refresh_token)
  - search_flights should return auth error when unauthenticated
  - `set_refresh_token` should include instructions for obtaining token (document.cookie, pointsyeah.com)
  - Should reject invalid/short tokens
  - Should show config resource with `needs_token` status
- **Authenticated Mode (1 test):**
  - Should expose all tools regardless of auth state

**Skipped tests (4/4):** Auth-dependent tests skipped due to revoked token (config resource authenticated status, get_search_history, search_flights input validation, Cognito auth refresh).

### End-to-End Verification

The null data envelope fix was verified via MCP tool invocation:

- Set refresh token and ran one-way search (SFO→NYC, tripType "1") — previously crashed with `Cannot read properties of null (reading 'length')`
- After fix, null data polls are skipped gracefully and search completes without error
- Round-trip search (JFK→LAX) still works correctly — returned 36 results with no regressions

### Functional Test Results

**Status:** All functional tests passed (22/22), all integration tests passed (4/4)

**Details:**

All tools are always registered at startup. Auth-requiring tools (`search_flights`, `get_search_history`) check authentication state at call time and return a clear error when not authenticated. The live search flow (Playwright-based `create_task` + HTTP polling `fetch_result`) is tested with mocked dependencies and fake timers. Three new regression tests cover null data envelope scenarios: null `data` field, null `data.result` array, and all-null poll responses.

**Summary:** 6 manual tests pass (4 skipped due to revoked token). All 22 functional tests pass. All 4 integration tests pass. Null data envelope fix verified via MCP tool invocation and regression tests.
