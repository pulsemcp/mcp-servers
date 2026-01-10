# Manual Testing Results

This file tracks the **most recent** manual test results for the Fly.io MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have your Fly.io API token in your `.env` file:

   ```bash
   # Copy from .env.example and add your real API token
   cp .env.example .env
   # Edit .env with your FLY_IO_API_TOKEN
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

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 0     |
| Passed      | 0     |
| Failed      | 0     |
| Pass Rate   | N/A   |

### Test Files

| File                    | Status           | Tests | Notes            |
| ----------------------- | ---------------- | ----- | ---------------- |
| `fly-io.manual.test.ts` | :hourglass: SKIP | 0/3   | Not yet executed |

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
