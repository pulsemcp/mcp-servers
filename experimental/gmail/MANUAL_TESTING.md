# Manual Testing Results

This file tracks the **most recent** manual test results for the Gmail MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:

   ```bash
   GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   GMAIL_IMPERSONATE_EMAIL=user@yourdomain.com
   ```

   To set up a service account:
   1. Create a Google Cloud project and enable Gmail API
   2. Create a service account with domain-wide delegation
   3. In Google Workspace Admin, grant the service account access to required scopes:
      - `https://www.googleapis.com/auth/gmail.readonly`
      - `https://www.googleapis.com/auth/gmail.modify`
      - `https://www.googleapis.com/auth/gmail.compose`
      - `https://www.googleapis.com/auth/gmail.send`
   4. Download the JSON key file and extract `client_email` and `private_key`

2. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

This setup script will:

- Check that .env file exists and has required credentials
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
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2026-03-08
**Branch:** claude/elicitation-fallback-pattern
**Commit:** 4fadce4
**Tested By:** Claude Code
**Environment:** Real Gmail API (service account) + mocked integration tests

### Test Results

**Manual Tests (real Gmail API): 11 passed, 4 skipped**

```
gmail-client.test.ts: 11 passed
  - list_email_conversations: 2 passed (inbox listing, query filtering)
  - search_email_conversations: 1 passed
  - get_email_conversation: 1 passed
  - change_email_conversation: 1 passed (star/unstar)
  - draft_email: 1 passed
  - send_email: 1 passed
  - download_email_attachments: 1 passed
  - Elicitation (accept): 1 passed — sent email after user accepted confirmation
  - Elicitation (decline): 1 passed — correctly blocked email when user declined
  - Elicitation (disabled): 1 passed — sent email without prompt when disabled

download-attachments.test.ts: 4 skipped (pre-existing MCP connection issue, unrelated to this change)
```

**Automated Tests (mocked):**

```
Functional Tests: 108 passed (108)
  - mime-utils.test.ts: 19 tests
  - auth.test.ts: 12 tests
  - tools.test.ts: 72 tests
  - oauth-setup.test.ts: 5 tests

Integration Tests: 24 passed (24)
  - Existing tests: 17 passed (with elicitation disabled)
  - Elicitation tests: 7 passed
    - send email when user confirms via elicitation
    - cancel send when user declines via elicitation
    - cancel send when user cancels via elicitation
    - not send when confirm=false
    - include draft ID in elicitation message
    - send without confirmation when disabled
    - return error when no mechanism available
```

**Overall:** 143 tests passed (108 functional + 24 integration + 11 manual)

### Notes

- New `@pulsemcp/elicitation` library in libs/elicitation/ for reusable MCP elicitation
- Gmail send_email tool now prompts for confirmation via MCP elicitation protocol
- Configurable via `ELICITATION_ENABLED` env var (defaults to true)
- TestMCPClient updated with elicitationHandler support

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                                                     |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------- |
| 2026-03-08 | 4fadce4 | PASS   | v0.3.0 - Elicitation support, 11 manual + 108 functional + 24 integration                 |
| 2026-03-05 | 9be3fff | PASS   | v0.2.1 - MIME encoding fixes, 108 functional (no API changes, manual tests not re-run)    |
| 2026-03-04 | 4d1634a | PASS   | v0.2.0 - HTML body support, 12 manual + 87 functional + 17 integration                    |
| 2026-02-22 | 04bed3a | PASS   | v0.1.2 - oauth-setup CLI subcommand, 83 functional + 15 integration (no API code changes) |
| 2026-02-09 | 2e45bf6 | PASS   | v0.1.1 - download_email_attachments, 17 manual + 66 functional + 15 integration           |
| 2026-01-25 | 9604fdc | PASS   | v0.1.0 - OAuth2 support, 12 manual + 64 functional + 11 integration                       |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated                                 |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing                                          |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests                                |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing                                              |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing                                          |
