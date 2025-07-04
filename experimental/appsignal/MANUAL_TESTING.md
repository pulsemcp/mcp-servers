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
   APPSIGNAL_API_KEY=your-api-key-here
   ```

### Running Tests

Run manual tests (automatically builds project and tests against built code):

```bash
npm run test:manual
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2025-07-04 00:19 PT  
**Branch:** tadasant/bump-all-versions  
**Commit:** e6e16a4  
**Tested By:** Claude  
**Environment:** Local development with API keys from .env

### Test Suite Results

**Overall:** 8/8 tests passed (100%)

**Test Files:**

- ✅ appsignal-new-tools.manual.test.ts: 1/1 tests passed
  - All new incident tools working correctly with GraphQL queries
- ✅ appsignal.manual.test.ts: 1/1 tests passed
  - Core workflow tested successfully (with expected API limitations)
- ✅ performance-tools.manual.test.ts: 4/4 tests passed
  - Error handling works, but no performance data available for full testing
- ✅ production-app.manual.test.ts: 2/2 tests passed
  - Bug fixes verified, production app returns proper results

**Notable Findings:**

- Log search API returns 400 errors (API limitation)
- AppSignal doesn't provide incident listing endpoints
- Performance incident testing limited by lack of data in test app
- All GraphQL queries working correctly after recent fixes

**Summary:** All manual tests passed successfully. The AppSignal MCP server is working correctly with proper error handling. Some features couldn't be fully tested due to API limitations and lack of test data, but all available functionality has been verified.
