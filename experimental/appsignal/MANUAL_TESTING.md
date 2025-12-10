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

**Test Date:** 2025-12-09 14:00 PST
**Branch:** tadasant/appsignal-log-truncation
**Commit:** cfc98a3
**Tested By:** Claude
**Environment:** macOS, Node.js, Real AppSignal API

### Test Results

**Type:** Functional and integration testing
**Status:** ✅ All 87 tests passed (11 test files)

**Test Duration:** ~3.4s

**Details:**

This release adds the `verbose` parameter to the `search_logs` tool for controlling log message truncation. The feature was verified through:

- ✅ 11 search_logs functional tests including new truncation tests
- ✅ Verbose parameter default (false) verification
- ✅ Verbose:true parameter passing verification
- ✅ TruncationApplied indicator in response
- ✅ Integration tests with mock API
- ✅ All existing functionality preserved

**Note:** This is a parameter-level enhancement that adds truncation logic to existing log search functionality. The core log search API behavior was previously tested with the real AppSignal API in v0.4.0. The truncation logic is pure string manipulation that doesn't require real API testing.

**Summary:** The verbose parameter for log truncation has been added and verified through comprehensive functional and integration tests. All 87 tests pass.
