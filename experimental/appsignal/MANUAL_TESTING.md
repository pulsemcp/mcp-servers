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

**Test Date:** 2025-12-09 11:52 PST
**Branch:** tadasant/appsignal-new-tools
**Commit:** d8654cb
**Tested By:** Claude
**Environment:** macOS, Node.js, Real AppSignal API

### Test Results

**Type:** Full manual testing with real API
**Status:** ✅ All 16 tests passed (6 test files)

**Test Duration:** 65.96s

**Details:**

New Tools Test Results:

- ✅ get_performance_samples: Working - retrieved 5 samples for McpServersController#index
- ✅ get_metrics: Working - returned mean (1347.69ms), P95 (2744.90ms), count (29497) for 24h
- ✅ get_metrics_timeseries: Working - 59 MINUTELY data points with mean and P95 values
- ✅ get_deploy_markers: Working - no markers in last 7 days (expected for test app)
- ✅ get_slow_requests: Working - found 3 slow endpoints with samples and timing breakdowns

Existing Tools:

- ✅ App selection and switching
- ✅ Performance incidents list (4 OPEN, 254 total)
- ✅ Log search with various parameter combinations
- ✅ Error handling for non-existent incidents
- ✅ State filtering (OPEN/CLOSED/WIP)
- ✅ Pagination parameters

**Sample Output from get_slow_requests:**

```
Slowest endpoints:
  1. McpServersController#index - Mean: 1352.15ms, Count: 1855466, Has N+1: true
  2. McpServersController#show - Mean: 581.02ms, Count: 6967348, Has N+1: true
  3. PagesController#home - Mean: 638.71ms, Count: 1204355, Has N+1: false
```

**Summary:** All 5 new tools are working correctly with the real AppSignal API. The tools provide granular performance data including samples, timing breakdowns, metrics aggregations, and time-series data for performance investigation.
