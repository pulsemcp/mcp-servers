# Manual Testing Results

This file tracks the **most recent** manual test results for the S3 MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up AWS credentials** - Ensure you have the necessary credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real AWS keys
   cp .env.example .env
   # Edit .env with your credentials
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

---

## Latest Test Results

**Test Date:** Not yet tested
**Branch:** N/A
**Commit:** N/A
**Tested By:** N/A
**Environment:** N/A

### Summary

Manual tests have not been run yet. To run them:

1. Set up AWS credentials in `.env`
2. Run `npm run test:manual:setup`
3. Run `npm run test:manual`

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., API unavailable)      |

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
