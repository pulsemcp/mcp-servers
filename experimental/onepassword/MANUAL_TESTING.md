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

**Test Date:** 2026-03-20
**Branch:** tadasant/dangerously-skip-elicitations
**Commit:** eee3e6b
**Tested By:** Claude
**Environment:** Linux, Node.js, 1Password CLI with service account token

### Summary

This PR adds `DANGEROUSLY_SKIP_ELICITATIONS` env variable and startup safety validation. The server now refuses to start unless elicitation is configured (HTTP fallback URLs) or explicitly opted out (`DANGEROUSLY_SKIP_ELICITATIONS=true`). Manual tests verify real 1Password API operations work correctly with the new elicitation bypass mechanism.

### Manual Test Results

**Status:** :white_check_mark: 3 passed, 1 skipped (expected)

| Test                                | Status             | Notes                                                     |
| ----------------------------------- | ------------------ | --------------------------------------------------------- |
| list vaults via MCP tool call       | :white_check_mark: | Successfully listed vaults via real 1Password API         |
| list items via MCP tool call        | :white_check_mark: | Successfully listed items in vault via real 1Password API |
| get item details via MCP tool call  | :white_check_mark: | Successfully retrieved item with credentials via real API |
| list items by tag via MCP tool call | :hourglass:        | Skipped — no items with test tag in vault (expected)      |

### Functional Test Results

**Status:** :white_check_mark: 59 passed, 0 failed

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 59    |
| Passed      | 59    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Key Tests Added/Modified

| Test Category                                 | Count | Notes                                                    |
| --------------------------------------------- | ----- | -------------------------------------------------------- |
| `isDangerouslySkipElicitations` helper        | 5     | Validates true/false/case-insensitive/unset behavior     |
| `hasHttpElicitationFallback` helper           | 6     | Validates URL presence, whitespace-only URL rejection    |
| `checkElicitationSafety` startup gate         | 6     | Validates safe/unsafe states for all config combinations |
| `ELICITATION_ENABLED=false` bypass prevention | 1     | Confirms direct ELICITATION_ENABLED=false is ignored     |
| DANGEROUSLY_SKIP_ELICITATIONS behavior        | 2     | Case-insensitive true, explicit false values             |

### Test Files

| File                         | Status             | Tests | Notes                                                                        |
| ---------------------------- | ------------------ | ----- | ---------------------------------------------------------------------------- |
| `tools.test.ts` (functional) | :white_check_mark: | 59    | Tools, elicitation config, credential redaction, whitelisting, safety checks |
| `onepassword.manual.test.ts` | :white_check_mark: | 3/4   | Real 1Password API calls with DANGEROUSLY_SKIP_ELICITATIONS=true             |

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials missing)  |
