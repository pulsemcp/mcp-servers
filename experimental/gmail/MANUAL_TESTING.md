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

**Test Date:** 2026-01-25
**Branch:** tadasant/gmail-oauth2-support
**Commit:** 61a0f08
**Tested By:** Claude Code
**Environment:** Node.js, Automated tests only (OAuth2 feature adds new auth mode; service account path unchanged)

### Test Results

**Automated Tests (mocked):**

```
Functional Tests: 61 passed (61)
  - auth.test.ts: 9 tests (OAuth2 + service account client creation, preference, error cases)
  - tools.test.ts: 52 tests (all existing tool tests)
Integration Tests: 11 passed (11)
Total: 72 tests passing
```

**Manual Tests (real API):**

Manual tests were not re-run for this version because:

- The existing service account auth path is completely unchanged (no code modifications)
- OAuth2 support is a new, additive feature that uses the same `IGmailClient` interface
- All tool implementations remain identical — only the auth layer was extended
- Previous manual test results (v0.0.5, commit b02e4cd) validated the full API integration

### Test Coverage

Automated test coverage for OAuth2 changes:

- [x] OAuth2GmailClient construction with required parameters
- [x] OAuth2GmailClient implements all IGmailClient interface methods
- [x] createDefaultClient() returns OAuth2GmailClient when OAuth2 env vars set
- [x] createDefaultClient() returns ServiceAccountGmailClient when service account env vars set
- [x] createDefaultClient() prefers OAuth2 when both credential sets present
- [x] Error handling for missing credentials (no credentials, partial OAuth2, partial service account)
- [x] All 52 existing tool tests pass (auth-agnostic via IGmailClient interface)
- [x] All 11 integration tests pass (MCP protocol end-to-end with mock server)

### Notes

- OAuth2 support added for personal Gmail accounts (@gmail.com)
- New OAuth2GmailClient class uses same IGmailClient interface as ServiceAccountGmailClient
- Auto-detection of auth mode via environment variables (OAuth2 takes precedence)
- User email fetched from Gmail profile API for send/draft operations
- Token caching with mutex pattern matching existing service account implementation
- One-time setup script (scripts/oauth-setup.ts) for obtaining refresh tokens

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                      |
| ---------- | ------- | ------ | ---------------------------------------------------------- |
| 2026-01-25 | 61a0f08 | PASS   | v0.1.0 - OAuth2 support, 61 functional + 11 integration    |
| 2026-01-24 | b02e4cd | PASS   | v0.0.5 - include_html parameter, 12 manual + 52 automated  |
| 2026-01-24 | f3d5154 | PASS   | All 12 manual tests + 58 automated tests passing           |
| 2026-01-23 | d728dca | PASS   | v0.0.4 - New tools (search, change, draft, send), 46 tests |
| 2026-01-03 | 36568ff | PASS   | v0.0.3 - Publish fix, 7 manual tests passing               |
| 2026-01-03 | e668d3d | PASS   | v0.0.1 - Initial release, 7 manual tests passing           |
