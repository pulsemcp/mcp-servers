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

**Test Date:** 2026-01-06 20:44 UTC
**Branch:** tadasant/onepassword-mcp-server
**Commit:** b2fd733
**Tested By:** Claude
**Environment:** Build verification only - no 1Password service account credentials available

### Test Results

**Type:** Build verification and functional tests only
**Status:** :white_check_mark: Build successful, functional tests passed

**Details:**

- Successfully built shared module
- Successfully built local module
- TypeScript compilation completed without errors
- All 26 functional tests passed
- Package ready for version bump

**Note:** Full manual testing with 1Password CLI and service account credentials was not performed. This is the initial implementation of the 1Password MCP server. The functional tests verify all tool logic with mocked responses.

### Functional Test Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 26    |
| Passed      | 26    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                         | Status             | Tests | Notes                                                 |
| ---------------------------- | ------------------ | ----- | ----------------------------------------------------- |
| `tools.test.ts`              | :white_check_mark: | 26    | Tools, URL parsing, unlock/lock, credential redaction |
| `onepassword.manual.test.ts` | :hourglass: SKIP   | 4     | Skipped - no credentials available                    |

### Detailed Results

Manual tests require 1Password CLI and a service account with access to at least one vault. The manual test file includes tests for:

- Listing vaults
- Listing items in a vault
- Getting item details
- Creating logins (skipped by default)

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials missing)  |
