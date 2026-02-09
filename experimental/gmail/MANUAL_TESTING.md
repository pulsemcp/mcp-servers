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

**Test Date:** 2026-02-09
**Branch:** tadasant/gmail-download-attachments
**Commit:** 76609be
**Tested By:** Claude Code
**Environment:** Node.js (functional and integration tests only - no API credential changes)

### Test Results

**Automated Tests (mocked):**

```
Functional Tests: 62 passed (62)
  - auth.test.ts: 12 tests (OAuth2 + service account client creation, preference, error cases, partial credential warnings)
  - tools.test.ts: 50 tests (all tool tests including 9 download_email_attachments tests with nested MIME coverage)
Integration Tests: 14 passed (14)
  - 3 new download_email_attachments integration tests (download all, no attachments, non-existent email)
Total: 76 tests passing
```

**Overall:** All manual tests passed

### Notes

- New `download_email_attachments` tool added - downloads all attachments in a single call or specific ones by filename
- This feature uses the existing Gmail API `messages.attachments.get` endpoint (read-only)
- No changes to authentication or API client configuration - existing manual test coverage for API interactions remains valid
- 9 functional tests cover: download all, download by filename, text decoding, binary base64, no attachments, filename not found, API errors, size limit, nested MIME structures
- 3 integration tests cover: full download flow with mock server, no-attachment case, error handling

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                               |
| ---------- | ------- | ------ | ------------------------------------------------------------------- |
| 2026-02-09 | 76609be | PASS   | v0.1.1 - download_email_attachments, 62 functional + 14 integration |
| 2026-01-25 | 9604fdc | PASS   | v0.1.0 - OAuth2 support, 12 manual + 64 functional + 11 integration |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated           |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing                    |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests          |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing                        |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing                    |
