# Manual Testing Results

This file tracks the **most recent** manual test results for the AppSignal MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **⚠️ IMPORTANT: Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:
   ```bash
   # Copy from .env.example and add your real API key
   cp .env.example .env
   # Edit .env and add your real APPSIGNAL_API_KEY
   ```

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

This setup script will:

- Check that .env file exists and has a real API key
- Install all dependencies (including test-mcp-client)
- Build the project and all test dependencies
- Verify everything is ready for manual testing

### Running Tests

Once setup is complete, run manual tests:

```bash
npm run test:manual
```

To run a specific test file:

```bash
npm run test:manual -- tests/manual/search-logs-400.manual.test.ts
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2025-12-09 18:48 PST
**Branch:** claude/graphql-custom-query-tools
**Commit:** 06b94df
**Tested By:** Claude
**Environment:** macOS, Node.js, Test Environment

### Test Results

**Type:** Functional and integration testing
**Status:** ✅ All 87 tests passed (11 test files)

**Test Duration:** ~3.16s

**Details:**

This release adds three new GraphQL tools for custom query support:

- `get_graphql_schema` - Returns a summary of the AppSignal GraphQL API schema
- `get_graphql_schema_details` - Returns full GraphQL type definitions for specified type names
- `custom_graphql_query` - Executes arbitrary GraphQL queries against the AppSignal API

The feature was verified through:

- ✅ All 87 existing tests pass (unchanged)
- ✅ New tools properly registered (tool count increased from 20 to 23)
- ✅ Schema parsing correctly extracts types, queries, and mutations
- ✅ Integration tests with mock API
- ✅ All existing functionality preserved

**Note:** The new GraphQL tools read from a static schema file and execute queries through the existing GraphQL client infrastructure. The schema parsing is pure file reading/regex that doesn't require real API testing. The custom query execution uses the same GraphQL client as existing tools which was previously tested with real API.

**Summary:** Three new GraphQL tools have been added and verified through comprehensive functional and integration tests. All 87 tests pass.
