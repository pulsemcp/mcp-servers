# Manual Testing Results

This file tracks the **most recent** manual test results for the 1Password MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up 1Password credentials** - Ensure you have:
   - 1Password CLI installed (`op`)
   - Service account token in your `.env` file:

   ```bash
   cp .env.example .env
   # Edit .env with your OP_SERVICE_ACCOUNT_TOKEN
   ```

### First-Time Setup

```bash
npm run test:manual:setup
```

### Running Tests

```bash
npm run test:manual
```

---

## Latest Test Results

**Test Date:** Not yet run
**Branch:** -
**Commit:** -
**Tested By:** -
**Environment:** -

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | -     |
| Passed      | -     |
| Failed      | -     |
| Pass Rate   | -     |

### Test Files

| File                         | Status | Tests | Notes |
| ---------------------------- | ------ | ----- | ----- |
| `onepassword.manual.test.ts` | -      | -     | -     |

### Detailed Results

Manual tests require 1Password CLI and a service account with access to at least one vault.

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials missing)  |
