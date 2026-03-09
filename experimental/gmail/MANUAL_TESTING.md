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

**Test Date:** 2026-03-09
**Branch:** claude/gmail-upsert-draft-list-drafts
**Commit:** cf71c2f
**Tested By:** Claude Code
**Environment:** Real Gmail API (service account) + local HTTP mock server for fallback

### Test Results

**Manual Tests (real Gmail API): 19 passed**

```
gmail-client.test.ts: 15 passed
  - list_email_conversations: 2 passed (inbox listing, query filtering)
  - search_email_conversations: 1 passed
  - get_email_conversation: 1 passed
  - change_email_conversation: 1 passed (star/unstar)
  - upsert_draft_email: 2 passed (create draft, update existing draft)
  - list_draft_emails: 1 passed (list drafts with metadata)
  - send_email: 1 passed
  - download_email_attachments: 1 passed
  - Native elicitation (accept): 1 passed — sent email after user accepted via MCP protocol
  - Native elicitation (decline): 1 passed — correctly blocked email when user declined via MCP protocol
  - Elicitation (disabled): 1 passed — sent email without prompt when disabled
  - HTTP fallback (accept): 1 passed — sent email via local mock HTTP server after acceptance
  - HTTP fallback (decline): 1 passed — blocked email via local mock HTTP server after decline

download-attachments.test.ts: 4 passed
  - should save attachment to /tmp/ and return file path
  - should produce an uncorrupted file matching direct API download
  - should return inline content when inline=true
  - should download all attachments when no filename specified
```

**Automated Tests (mocked):**

```
Functional Tests: 115 passed (115)
  - mime-utils.test.ts: 19 tests
  - auth.test.ts: 12 tests
  - tools.test.ts: 79 tests (7 new: upsert_draft_email update, list_draft_emails)
  - oauth-setup.test.ts: 5 tests

Integration Tests: 27 passed (27)
  - Existing tests: 20 passed (with elicitation disabled, includes new draft tests)
  - Elicitation tests: 7 passed
```

**Overall:** 161 tests passed (115 functional + 27 integration + 19 manual)

### Notes

- Renamed `draft_email` to `upsert_draft_email` with optional `draft_id` for in-place updates
- Added `list_draft_emails` tool with optional `thread_id` filtering
- Both new tools (update draft, list drafts) manually tested against real Gmail API
- All existing elicitation tests continue to pass
- New updateDraft method added to IGmailClient interface and Gmail API client layer

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                                                        |
| ---------- | ------- | ------ | -------------------------------------------------------------------------------------------- |
| 2026-03-09 | cf71c2f | PASS   | v0.4.0 - upsert_draft_email + list_draft_emails, 19 manual + 115 functional + 27 integration |
| 2026-03-08 | edf3465 | PASS   | v0.3.0 - Elicitation support, 13 manual + 108 functional + 24 integration                    |
| 2026-03-05 | 9be3fff | PASS   | v0.2.1 - MIME encoding fixes, 108 functional (no API changes, manual tests not re-run)       |
| 2026-03-04 | 4d1634a | PASS   | v0.2.0 - HTML body support, 12 manual + 87 functional + 17 integration                       |
| 2026-02-22 | 04bed3a | PASS   | v0.1.2 - oauth-setup CLI subcommand, 83 functional + 15 integration (no API code changes)    |
| 2026-02-09 | 2e45bf6 | PASS   | v0.1.1 - download_email_attachments, 17 manual + 66 functional + 15 integration              |
| 2026-01-25 | 9604fdc | PASS   | v0.1.0 - OAuth2 support, 12 manual + 64 functional + 11 integration                          |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated                                    |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing                                             |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests                                   |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing                                                 |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing                                             |
