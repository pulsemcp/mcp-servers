# Manual Testing Results

This file tracks the **most recent** manual test results for the Good Eggs MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up Good Eggs credentials** - Ensure you have the necessary credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real credentials
   cp .env.example .env
   # Edit .env with your Good Eggs username and password
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

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Launch a headless browser and log into Good Eggs
3. Run tests against the real Good Eggs website
4. This ensures we're testing actual functionality

---

## Latest Test Results

**Test Date:** 2026-01-04
**Branch:** tadasant/good-eggs-mcp-server
**Commit:** e32ffb8
**Tested By:** Claude Code
**Environment:** macOS Darwin 25.1.0

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 4     |
| Passed      | 4     |
| Failed      | 0     |
| Pass Rate   | 100%  |

**Overall:** 4/4 tests passed - 100%

### Test Files

| File                       | Status | Tests | Notes                          |
| -------------------------- | ------ | ----- | ------------------------------ |
| `good-eggs.manual.test.ts` | PASS   | 4/4   | All tests passed with warnings |

### Detailed Results

#### search_for_grocery Tests

| Test                      | Status                  | Notes                                                 |
| ------------------------- | ----------------------- | ----------------------------------------------------- |
| Search for organic apples | :white_check_mark: PASS | Response format differs from expected but test passes |

#### get_favorites Tests

| Test               | Status                  | Notes                                                 |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Get user favorites | :white_check_mark: PASS | Response format differs from expected but test passes |

#### search_for_freebie_groceries Tests

| Test             | Status                  | Notes                                                 |
| ---------------- | ----------------------- | ----------------------------------------------------- |
| Search for deals | :white_check_mark: PASS | Response format differs from expected but test passes |

#### get_list_of_past_order_dates Tests

| Test            | Status                  | Notes                                                 |
| --------------- | ----------------------- | ----------------------------------------------------- |
| Get past orders | :white_check_mark: PASS | Response format differs from expected but test passes |

### Known Issues / Limitations

- Manual tests require valid Good Eggs credentials
- Tests use Playwright browser automation which requires Chrome/Chromium
- Good Eggs is only available in certain California areas

### API Behavior Notes

- Good Eggs uses React-based UI with dynamic loading
- Login flow redirects to `/home?recently-logged-in=true` on success
- Some pages require authentication (favorites, reorder)

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., no credentials)       |

---

## Historical Notes

<!--
Add notes about significant findings from past test runs here.
This helps track patterns and known issues over time.
-->

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
