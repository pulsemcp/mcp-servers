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

This is the initial release of the PointsYeah MCP server. All 16 manual tests were run against the real PointsYeah API with a real user account. Note: 5 tools were subsequently removed (get_flight_recommendations, get_hotel_recommendations, get_explorer_count, get_user_membership, get_user_preferences) as they were not needed. The remaining 2 tools (search_flights, get_search_history) were fully tested in the original run.

**Test Categories:**

- Tool & Resource Discovery (3 tests): Lists tools, config resource, and config content correctly
- Authentication - Cognito Token Refresh (1 test): Successfully refreshes AWS Cognito tokens and calls API
- Read-Only Tools (1 test): get_search_history
- Flight Search - Input Validation (3 tests): Rejects missing returnDate, invalid dates, and missing required fields
- Direct Client - Cognito Auth (1 test): Directly calls refreshCognitoTokens() with real token
- Direct Client - Flight Search via Playwright (1 test): Full Playwright browser automation flow with task creation and polling

**Key Findings:**

1. The `fetch_result` polling endpoint returns `completed_sub_tasks` and `total_sub_tasks` in `data` alongside additional fields like `status` not in our TypeScript types
2. First MCP tool call can fail transiently during subprocess warmup; retry with delay resolves it
3. MCP SDK has hardcoded 60s request timeout; flight search must be tested directly bypassing MCP protocol

**Summary:** All manual tests pass against the real PointsYeah API. The server correctly authenticates via AWS Cognito, performs award flight searches via Playwright browser automation, and retrieves search history.
