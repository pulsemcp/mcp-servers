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
**Branch:** claude/gmail-write-tools-v0.0.4
**Commit:** 3aaf66f
**Tested By:** Claude Code
**Environment:** Node.js, Service Account with Domain-Wide Delegation

### Test Results

**Type:** Functional and integration testing (manual tests require API credentials)
**Status:** PASS (automated tests)

```
Functional Tests: 47 passed (47)
Integration Tests: 11 passed (11)
Total: 58 tests passing
```

### Test Coverage

The functional and integration tests cover:

- [x] list_email_conversations (with count, labels, sort_by, after_date parameters)
- [x] get_email_conversation (full format with body decoding)
- [x] search_email_conversations (Gmail query syntax)
- [x] change_email_conversation (read/unread, starred, archive, labels)
- [x] draft_email (new drafts, thread replies)
- [x] send_email (direct send, send from draft, replies)
- [x] Tool group filtering (readonly, readwrite, readwrite_external)
- [x] Error handling for all tools

### Notes

- Manual tests (`npm run test:manual`) require real Gmail API credentials
- Functional tests use mocked Gmail client and provide full coverage of implementation logic
- Integration tests use TestMCPClient with mocked external APIs
- The `after_date` parameter for `list_email_conversations` was added in this version
- Tool groups feature allows permission-based access control (readonly vs readwrite vs readwrite_external)

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                      |
| ---------- | ------- | ------ | ---------------------------------------------------------- |
| 2026-01-24 | 3aaf66f | PASS   | Added after_date parameter, tool groups, 58 tests passing  |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing               |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing           |
