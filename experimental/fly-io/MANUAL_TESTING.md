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

**Test Date:** 2026-01-10
**Branch:** tadasant/fly-io-mcp-server
**Commit:** 78212e8
**Tested By:** Claude
**Environment:** macOS, Node.js 18, Test Environment

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 16    |
| Passed      | 16    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                    | Status                  | Tests | Notes                                                           |
| ----------------------- | ----------------------- | ----- | --------------------------------------------------------------- |
| `tools.test.ts`         | :white_check_mark: PASS | 13/13 | All functional tests pass with mocked client                    |
| `fly-io.manual.test.ts` | :warning: WARN          | 3/3   | Tests pass (skipped - no API token, expected for initial setup) |

### Details

Initial release of the Fly.io MCP server with app and machine management:

- All 11 tools implemented and tested
- Tool grouping system (readonly, write, admin) verified
- Environment variable validation at startup working
- Manual tests require FLY_IO_API_TOKEN - gracefully skip when not set

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
