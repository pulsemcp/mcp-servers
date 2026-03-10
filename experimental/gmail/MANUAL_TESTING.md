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

**Test Date:** 2026-03-10
**Branch:** claude/add-draft-delete-to-upsert
**Commit:** 273d5f5
**Tested By:** Claude Code
**Environment:** Functional tests (mocked)

### Test Results

**Note:** This change adds a `delete` parameter to `upsert_draft_email` that routes to the existing `deleteDraft()` client method (implemented since v0.0.4). No new Gmail API interaction code was written — the underlying `DELETE /gmail/v1/users/me/drafts/{draftId}` endpoint call is unchanged. Manual test results carried forward from v0.4.0 (commit cf71c2f) which tested all Gmail API functionality including draft operations.

**Gmail Functional Tests (mocked):**

```
Functional Tests: 119 passed (119)
  - mime-utils.test.ts: 19 tests
  - auth.test.ts: 12 tests
  - tools.test.ts: 83 tests (4 new: delete draft, delete non-existent, delete without draft_id, delete ignores other params)
  - oauth-setup.test.ts: 5 tests
```

**Overall:** 119 tests passed

### Notes

- Tool-level routing change only: adds `delete: true` parameter that calls existing `client.deleteDraft()` method
- No new API interaction code — `deleteDraft()` has been in the codebase since v0.0.4 and was last manually tested with real APIs in v0.4.0
- 4 new functional tests verify: successful deletion, error on non-existent draft, error when draft_id missing, extra params ignored during delete
- `.env` credentials not available in this environment; manual API tests carried forward from v0.4.0

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                                                        |
| ---------- | ------- | ------ | -------------------------------------------------------------------------------------------- |
| 2026-03-10 | 273d5f5 | PASS   | v0.4.5 - delete param for upsert_draft_email (no new API code), 119 functional               |
| 2026-03-09 | 6454fc5 | PASS   | v0.4.4 - fail-safe elicitation gate (no API changes), 12 elicitation + 115 functional        |
| 2026-03-09 | b74bf71 | PASS   | v0.4.3 - build-fix-only (reordered prepare-publish.js + --ignore-scripts), 115 functional    |
| 2026-03-09 | e9ee1e5 | PASS   | v0.4.1 - packaging-only bump (updated bundled elicitation lib), 115 functional + 5 lib unit  |
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
