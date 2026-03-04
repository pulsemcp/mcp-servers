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

**Test Date:** 2026-03-04
**Branch:** claude/gmail-html-body-support
**Commit:** 75eee5a
**Tested By:** Claude Code
**Environment:** Functional + integration tests (no .env credentials available for manual tests)

### Test Results

**Manual Tests (real Gmail API):** Not re-run — no API credentials available in this environment. This change modifies tool parameter names and MIME message building. Previous manual test results (v0.1.1, commit 2e45bf6) validated the Gmail API integration; core API interaction patterns remain unchanged.

**Automated Tests (mocked):**

```
Functional Tests: 87 passed (87)
  - auth.test.ts: 12 tests (OAuth2 + service account client creation, preference, error cases, partial credential warnings)
  - tools.test.ts: 70 tests (all tool tests including new plaintext_body/html_body tests for draft_email and send_email)
  - oauth-setup.test.ts: 5 tests (CLI argument validation, env var fallback, OAuth flow initiation)
Integration Tests: 17 passed (17)
  - 2 draft_email tests (plaintext_body + html_body)
  - 2 send_email tests (plaintext_body + html_body)
  - 4 download_email_attachments integration tests
  - 9 other integration tests (list, get, search, change, setup)
Total: 104 tests passing (87 functional + 17 integration)
```

**Overall:** All automated tests passed

### Notes

- **BREAKING**: `body` parameter replaced with `plaintext_body` and `html_body` in `draft_email` and `send_email` tools
- MIME message builder now supports text/html content type and multipart/alternative when both are provided
- New tests verify HTML body is passed through to client correctly and response includes format indicator
- All mock clients (functional and integration) updated to handle new parameter names

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                                                     |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------- |
| 2026-03-04 | 75eee5a | PASS   | v0.2.0 - HTML body support, 87 functional + 17 integration (no API credentials available) |
| 2026-02-22 | 04bed3a | PASS   | v0.1.2 - oauth-setup CLI subcommand, 83 functional + 15 integration (no API code changes) |
| 2026-02-09 | 2e45bf6 | PASS   | v0.1.1 - download_email_attachments, 17 manual + 66 functional + 15 integration           |
| 2026-01-25 | 9604fdc | PASS   | v0.1.0 - OAuth2 support, 12 manual + 64 functional + 11 integration                       |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated                                 |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing                                          |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests                                |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing                                              |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing                                          |
