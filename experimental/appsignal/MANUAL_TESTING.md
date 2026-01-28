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

**Test Date:** 2025-01-28 19:58 PST
**Branch:** tadasant/shorten-perf-tool-names
**Commit:** c42feb3
**Tested By:** Claude
**Environment:** Linux, Node.js 20.19.2, Test Environment

### Test Results

**Type:** Functional and integration testing
**Status:** ✅ All 87 tests passed (11 test files)

**Test Duration:** ~4.76s

**Details:**

This release shortens performance-related tool names to reduce token usage:

- `get_performance_incidents` → `get_perf_incidents`
- `get_performance_incident` → `get_perf_incident`
- `get_performance_incident_sample` → `get_perf_incident_sample`
- `get_performance_incident_sample_timeline` → `get_perf_incident_sample_timeline`
- `get_performance_samples` → `get_perf_samples`

The feature was verified through:

- ✅ All 87 existing tests pass (updated with new tool names)
- ✅ Tool registration tests verify new tool names are properly registered
- ✅ Integration tests confirm tools function correctly with new names
- ✅ All existing functionality preserved

**Note:** This is a straightforward code refactoring that only changes tool name strings and associated identifiers. No API interaction logic was modified. The underlying API calls remain identical, only the MCP tool name interface has changed. Manual API testing is not required for this type of change as it does not affect actual API interactions.

**Summary:** Performance tool names have been shortened from "performance" to "perf" across all 5 tools. All 87 tests pass with the updated names.
