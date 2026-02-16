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
**Commit:** 5e54ee8
**Tested By:** Claude
**Environment:** Linux, Node.js

### Test Results

**Type:** Functional + Integration tests
**Status:** All functional tests passed (8/8), all integration tests passed (4/4)

**Test Duration:** ~1s

**Details:**

Migrated flight search from broken `api2.pointsyeah.com` task-based API to new `api.pointsyeah.com/v2/live/explorer/search` direct HTTP API. Removed Playwright dependency entirely. All functional and integration tests pass with updated mocks reflecting the new explorer API response format.

**Note:** Manual API tests could not be run because the provided Cognito refresh token is revoked. Manual testing with a valid refresh token is recommended before merging.

**Summary:** Functional and integration tests confirm the explorer API migration works correctly. Manual API testing blocked by expired credentials.
