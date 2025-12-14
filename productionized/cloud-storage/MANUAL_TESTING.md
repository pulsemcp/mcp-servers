# Manual Testing Results

This file tracks the **most recent** manual test results for the Cloud Storage MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up GCS credentials** - Ensure you have the necessary credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real GCS credentials
   cp .env.example .env
   # Edit .env with your credentials:
   # - GCS_BUCKET (required)
   # - GCS_KEY_FILE (path to service account JSON key)
   ```

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

This setup script will:

- Check environment setup (.env file)
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
npm run test:manual -- tests/manual/cloud-storage.manual.test.ts
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

---

## Latest Test Results

**Test Date:** Not yet tested
**Branch:** Not yet tested
**Commit:** Not yet tested
**Tested By:** Not yet tested
**Environment:** Not yet tested

### Summary

| Metric      | Value          |
| ----------- | -------------- |
| Total Tests | Not yet tested |
| Passed      | Not yet tested |
| Failed      | Not yet tested |
| Pass Rate   | Not yet tested |

### Test Files

| File                           | Status           | Tests | Notes      |
| ------------------------------ | ---------------- | ----- | ---------- |
| `cloud-storage.manual.test.ts` | :hourglass: SKIP | -     | Not tested |

### Detailed Results

Manual testing is pending GCS credentials from the user.

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials needed)   |

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
