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

**Test Date:** 2026-02-16 03:45 UTC
**Branch:** tadasant/pointsyeah-mcp-server
**Commit:** 7a179dd
**Tested By:** Claude
**Environment:** Linux, Node.js with Playwright Chromium

### Test Results

**Type:** Manual integration testing against real PointsYeah API
**Status:** All manual tests passed (16/16)

**Test Duration:** ~131s

**Details:**

This is the initial release of the PointsYeah MCP server. All 16 manual tests were run against the real PointsYeah API with a real user account.

**Test Categories:**

- Tool & Resource Discovery (3 tests): Lists all 7 tools, config resource, and config content correctly
- Authentication - Cognito Token Refresh (1 test): Successfully refreshes AWS Cognito tokens and calls API
- Read-Only Tools - User API (3 tests): get_search_history, get_user_membership, get_user_preferences
- Read-Only Tools - Explorer API (4 tests): get_explorer_count, get_flight_recommendations (with/without filter), get_hotel_recommendations
- Flight Search - Input Validation (3 tests): Rejects missing returnDate, invalid dates, and missing required fields
- Direct Client - Cognito Auth (1 test): Directly calls refreshCognitoTokens() with real token
- Direct Client - Flight Search via Playwright (1 test): Full Playwright browser automation flow with task creation and polling

**Key Findings:**

1. The `fetch_result` polling endpoint returns `{result, status}` in `data`, not `{completed_sub_tasks, total_sub_tasks}` as the TypeScript types define
2. Flight recommendations departure filter returns 500 - the API may not support filtering via POST body
3. First MCP tool call can fail transiently during subprocess warmup; retry with delay resolves it
4. MCP SDK has hardcoded 60s request timeout; flight search must be tested directly bypassing MCP protocol
5. Hotel `points` field can be an object rather than a number depending on hotel program

**Summary:** All 16 manual tests pass against the real PointsYeah API. The server correctly authenticates via AWS Cognito, performs award flight searches via Playwright browser automation, and retrieves user data and Explorer recommendations.
