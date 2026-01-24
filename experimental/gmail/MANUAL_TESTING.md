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

**Test Date:** 2026-01-24
**Branch:** github-actions-bot/gmail-include-html
**Commit:** b02e4cd
**Tested By:** Claude Code
**Environment:** Node.js, Service Account with Domain-Wide Delegation

### Test Results

**Automated Tests (mocked):**

```
Functional Tests: 52 passed (52)
Total: 52 tests passing
```

**Manual Tests (real API):**

```
 ✓ tests/manual/gmail-client.test.ts (12 tests) 3782ms
   ✓ listMessages > should list messages from inbox  578ms
   ✓ listMessages > should filter by query
   ✓ getMessage > should get a message with full format  315ms
   ✓ getMessage > should get a message with metadata format
   ✓ getMessage > should decode email body content  335ms
   ✓ modifyMessage > should modify labels on a message  779ms
   ✓ drafts > should create a draft  326ms
   ✓ drafts > should list drafts
   ✓ drafts > should get a draft by ID
   ✓ drafts > should delete a draft  405ms
   ✓ sendMessage > should send a test email (to same account)
   ✓ authentication > should use service account authentication

 Test Files  1 passed (1)
      Tests  12 passed (12)
```

### Test Coverage

All tests verified against real Gmail API:

- [x] listMessages - inbox listing with 2 messages found
- [x] listMessages - query filtering (10 messages from last 24 hours)
- [x] getMessage - full format with headers and body
- [x] getMessage - metadata format
- [x] getMessage - body decoding (base64url)
- [x] modifyMessage - add/remove STARRED label
- [x] createDraft - created draft successfully
- [x] listDrafts - found 5 drafts
- [x] getDraft - retrieved draft by ID
- [x] deleteDraft - deleted draft successfully
- [x] sendMessage - sent test email to same account
- [x] Service account authentication verified

### Notes

- All manual tests passed against real Gmail API
- Service account impersonating: tadas@tadasant.com
- Tests verify read operations (list, get), write operations (modify labels, drafts), and send operations
- New `include_html` parameter added to `get_email_conversation` for returning raw HTML content
- Tool groups feature allows permission-based access control (readonly vs readwrite vs readwrite_external)

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                      |
| ---------- | ------- | ------ | ---------------------------------------------------------- |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated  |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing           |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing               |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing           |
