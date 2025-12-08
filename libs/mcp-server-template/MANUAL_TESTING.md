# Manual Testing Results

This file tracks the **most recent** manual test results for the NAME MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real API keys
   cp .env.example .env
   # Edit .env with your credentials
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
npm run test:manual -- tests/manual/your-test.manual.test.ts
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

---

## Latest Test Results

**Test Date:** YYYY-MM-DD
**Branch:** branch-name
**Commit:** `abc1234` (short hash)
**Tested By:** Your Name
**Environment:** Local development with API keys from .env

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | X     |
| Passed      | Y     |
| Failed      | Z     |
| Pass Rate   | XX%   |

### Test Files

| File                  | Status                  | Tests | Notes                          |
| --------------------- | ----------------------- | ----- | ------------------------------ |
| `NAME.manual.test.ts` | :white_check_mark: PASS | X/Y   | All core functionality working |

### Detailed Results

#### example_tool Tests

| Test                                 | Status                  | Notes                    |
| ------------------------------------ | ----------------------- | ------------------------ |
| Process message with plain format    | :white_check_mark: PASS | Response time: Xms       |
| Process message with JSON format     | :white_check_mark: PASS |                          |
| Process message with markdown format | :white_check_mark: PASS |                          |
| Handle empty message                 | :white_check_mark: PASS | Returns validation error |

#### search_items Tests

| Test                   | Status                  | Notes                     |
| ---------------------- | ----------------------- | ------------------------- |
| Search by query        | :white_check_mark: PASS | Returns paginated results |
| Get item by ID         | :white_check_mark: PASS |                           |
| Search with pagination | :white_check_mark: PASS | offset/limit working      |
| Handle not found       | :white_check_mark: PASS | Returns helpful message   |

### Known Issues / Limitations

Document any issues discovered during manual testing:

- None identified

### API Behavior Notes

Document any API quirks or behaviors discovered:

- None noted

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., API unavailable)      |

---

## Historical Notes

<!--
Add notes about significant findings from past test runs here.
This helps track patterns and known issues over time.

Example:
- 2025-01-15: API rate limits caused intermittent failures - added retry logic
- 2025-01-10: Discovered pagination bug when offset > total count
-->

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
