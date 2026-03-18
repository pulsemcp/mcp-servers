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

**Test Date:** 2026-03-18 20:50 UTC
**Branch:** claude-opus-4/onepassword-elicitation
**Commit:** cf293d3
**Tested By:** Claude
**Environment:** Real 1Password API with service account credentials

### Test Results

**Type:** Manual tests against real 1Password API
**Status:** :white_check_mark: All manual tests passed

**Details:**

- Connected to real 1Password service account
- Listed 4 vaults successfully (Proctor Accounts & Secrets, PulseMCP Sub-Registry API, Team, Test Vault)
- Listed 76 items in first vault
- Retrieved item details for "PagerDuty API Key" (SECURE_NOTE category)
- Elicitation disabled for manual tests (TestMCPClient doesn't support native elicitation)
- Elicitation logic verified by 37 functional tests with mocked dependencies
- Create operations intentionally skipped to avoid polluting vault

### Test Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 4     |
| Passed      | 3     |
| Skipped     | 1     |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Functional Test Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 37    |
| Passed      | 37    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                         | Status             | Tests | Notes                                                       |
| ---------------------------- | ------------------ | ----- | ----------------------------------------------------------- |
| `tools.test.ts`              | :white_check_mark: | 37    | Tools, elicitation config, credential redaction, whitelisting |
| `onepassword.manual.test.ts` | :white_check_mark: | 3+1   | 3 passed, 1 skipped (create_login - avoids vault pollution)  |

### Detailed Results

Manual tests ran against real 1Password API with elicitation disabled (ELICITATION_ENABLED=false). Results:

- **list_vaults**: SUCCESS - Found 4 vault(s)
- **list_items**: SUCCESS - Found 76 item(s) in vault
- **get_item**: SUCCESS - Retrieved item "PagerDuty API Key" (SECURE_NOTE)
- **create_login**: SKIPPED - Intentionally skipped to avoid polluting vault

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials missing)  |
