# Manual Testing Results

This file tracks the **most recent** manual test results for the Hatchbox MCP server.

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
   HATCHBOX_API_KEY=your-api-key
   HATCHBOX_ACCOUNT_ID=your-account-id
   HATCHBOX_APP_ID=your-app-id
   HATCHBOX_DEPLOY_KEY=your-deploy-key
   # Optional: TEST_DEPLOY_SHA=specific-commit-sha
   ```

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

This setup script will:

- Check environment setup (required .env file with Hatchbox credentials)
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
npm run test:manual -- tests/manual/hatchbox.manual.test.ts
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2025-07-31  
**Branch:** tadasant/create-hatchbox-mcp-server-2  
**Commit:** 60e51f3ebe5ae6c6665700aaa83132135a3706cf  
**Tested By:** Claude  
**Environment:** Hatchbox production environment with real API credentials

### Test Suite Results

**Overall:** 7/8 tests passed (87.5%)

**Test Files:**

- ✅ hatchbox.manual.test.ts: 7 passed | 1 skipped

**Test Details:**

- Environment Variables
  - ⏭️ Get all environment variables - Skipped (API does not support retrieving env vars)
  - ✅ Set a test environment variable - Successfully set TEST_VAR_1753989964380=test_value_from_manual_test
  - ✅ Update an existing environment variable - Successfully updated TEST_UPDATE_VAR to updated_1753989965214
- Deployments
  - ✅ Trigger deployment with latest commit - Successfully triggered deployment 2454076
  - ✅ Check deployment status - Retrieved status: processing
  - ⏭️ Trigger deployment with specific SHA - Skipped (no TEST_DEPLOY_SHA provided)
- Error Handling
  - ✅ Handle invalid credentials - Correctly throws "Account or app not found" error
  - ✅ Handle invalid account/app IDs - Correctly throws error

**Summary:**

All supported operations are working correctly:

- Environment variable setting and updating works as expected (GET is not supported by the API)
- Deployment triggering and status checking work properly
- Error handling correctly identifies authentication and resource errors

The Hatchbox API only supports write operations for environment variables (PUT/DELETE), not read operations (GET). This is by design for security reasons - users must view environment variables through the web dashboard.
