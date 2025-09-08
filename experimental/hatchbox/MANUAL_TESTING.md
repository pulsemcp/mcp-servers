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

**Test Date:** 2025-09-08 15:56 PDT  
**Branch:** tadasant/setup-packages-for-mcp-registry  
**Commit:** 38c0ba3  
**Tested By:** Claude  
**Environment:** Build verification only - no API keys available

### Test Results

**Type:** Build verification only
**Status:** ✅ Build successful

**Details:**

- Successfully built shared module
- Successfully built local module with integration tests
- TypeScript compilation completed without errors
- Package ready for version bump

**Note:** Full manual testing with API keys was not performed. This is a metadata-only change (adding mcpName field) that does not affect functionality.

- Deployment status checking works properly
- Error handling correctly identifies authentication and resource errors

The Hatchbox API only supports write operations for environment variables (PUT/DELETE), not read operations (GET). This is by design for security reasons - users must view environment variables through the web dashboard.

## SSH-Based Testing Results

**Test Date:** 2025-08-01  
**Branch:** tadasant/create-hatchbox-mcp-server-2  
**Commit:** cb20c155474175005dd7e6af91e639c55e3cd56e  
**Tested By:** Claude  
**Environment:** Hatchbox production environment with SSH access

### Configuration

- WEB_SERVER_IP_ADDRESS: 165.232.133.75
- READONLY: false
- ALLOW_DEPLOYS: true

### Test Suite Results

**Overall:** 10/10 tests passed (100%)

**Test Details:**

- SSH-based Environment Variable Reading
  - ✅ Get all environment variables via SSH - Retrieved 85 environment variables
  - ✅ Get specific environment variable via SSH - Successfully retrieved RAILS_ENV=staging
  - ✅ Handle non-existent variable - Correctly returned null
- Environment Variable Writing
  - ✅ Set a test environment variable - Successfully set TEST_VAR_1753994899378
  - ✅ Update an existing environment variable - Successfully updated TEST_UPDATE_VAR
- Deployments
  - ✅ Trigger deployment with latest commit - Successfully triggered deployment 2454367
  - ✅ Check deployment status - Retrieved status: processing
  - ✅ Handle invalid credentials - Correctly throws errors
  - ✅ Handle invalid account/app IDs - Correctly throws errors

**Summary:**

The SSH-based environment variable reading functionality works perfectly. All features are now operational:

- SSH access successfully retrieves all environment variables from the running Rails process
- Security modes (READONLY and ALLOW_DEPLOYS) work as expected
- Conditional tool surfacing based on configuration is functioning correctly
