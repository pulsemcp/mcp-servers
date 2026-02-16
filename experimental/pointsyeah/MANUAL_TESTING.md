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

2. **Set up API credentials** - Ensure you have the necessary credentials in your `.env` file:
   ```bash
   # Create .env in experimental/pointsyeah/ with:
   POINTSYEAH_REFRESH_TOKEN=your_refresh_token_here
   ```

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
**Commit:** 419855b
**Tested By:** Claude
**Environment:** Linux, Node.js

### Manual Test Results

**Status:** 6 passed, 4 failed (10 total)
**Test Duration:** ~19s

**Passing tests (6/10):**

- Tool Discovery: lists all 2 tools (search_flights, get_search_history)
- Resources: lists config resource, reads it with correct version (0.1.2)
- Input Validation: rejects round-trip without returnDate, rejects invalid date format, rejects missing required fields

**Failing tests (4/10):** All failures are due to revoked Cognito refresh token (`NotAuthorizedException: Refresh Token has been revoked`), not code issues:

- Authentication - Cognito Token Refresh
- Read-Only Tools - get_search_history
- Direct Client - Cognito Auth
- Direct Client - Explorer Search API

### Functional + Integration Test Results

**Status:** All functional tests passed (8/8), all integration tests passed (4/4)

**Details:**

Migrated flight search from broken `api2.pointsyeah.com` task-based API to new `api.pointsyeah.com/v2/live/explorer/search` direct HTTP API. Removed Playwright dependency entirely.

**Note:** Manual API tests that require authentication could not fully pass because the Cognito refresh token is revoked (likely due to inactivity-based revocation). Manual testing of the explorer search flow with a fresh, valid refresh token is recommended before merging.

**Summary:** All non-auth tests pass. Auth-dependent tests blocked by expired credentials. Functional and integration tests (with mocks) confirm the explorer API migration works correctly.
