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
   # Copy from .env.example if available and add your real API keys
   APPSIGNAL_TOKEN=your-token-here
   APPSIGNAL_CLIENT_ID=your-client-id-here
   APPSIGNAL_CLIENT_SECRET=your-client-secret-here
   ```

### Running Tests

Run manual tests (automatically builds and tests against built code):

```bash
npm run test:manual
```

## Latest Test Results

**Test Date:** [DATE]  
**Branch:** [BRANCH]  
**Commit:** [COMMIT_HASH]  
**Tested By:** [NAME]  
**Environment:** Local development with API keys from .env

### Test Suite Results

**Overall:** [X/Y] tests passed ([PERCENTAGE]%)

**Test Files:**

- ❓ appsignal-new-tools.manual.test.ts: [RESULT]
- ❓ appsignal.manual.test.ts: [RESULT]
- ❓ performance-tools.manual.test.ts: [RESULT]
- ❓ production-app.manual.test.ts: [RESULT]

**Summary:** [Add summary of test results and any notable findings]
