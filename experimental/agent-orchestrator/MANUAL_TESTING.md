# Manual Testing Results

This file tracks the **most recent** manual test results for the agent-orchestrator MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real API keys
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Ensure Agent Orchestrator API is accessible** - Tests default to staging (`https://ao.staging.pulsemcp.com`). Override `AGENT_ORCHESTRATOR_BASE_URL` in `.env` to target a different instance (e.g., local or production).

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

This setup script will:

- Check environment setup (.env file)
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

---

## Latest Test Results

**Test Date:** 2026-03-10
**Branch:** fix/allowed-agent-roots-subdirectory-matching
**Commit:** 9f4e80f
**Tested By:** Claude Code (automated)
**Environment:** Sandbox — staging API unreachable; functional tests used

### Summary

**Overall:** :white_check_mark: SUCCESS - 167/167 functional tests pass.

Fixed `ALLOWED_AGENT_ROOTS` validation to use `subdirectory` and `branch` for disambiguation when multiple allowed agent roots share the same `git_root`. Added 8 new tests covering the subdirectory disambiguation logic for both unit and integration layers.

| Test Category              | Status             | Tests   |
| -------------------------- | ------------------ | ------- |
| tools.test.ts              | :white_check_mark: | 134/134 |
| health-check.test.ts       | :white_check_mark: | 31/31   |
| map-agent-root.test.ts     | :white_check_mark: | 2/2     |
| Manual tests (staging API) | :hourglass: SKIP   | N/A     |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 134 tool tests pass (8 new subdirectory disambiguation tests)
- :white_check_mark: **Health check logic** - 31 tests pass unchanged
- :white_check_mark: **Agent root mapping** - 2 tests pass unchanged

### Notes

- Manual tests skipped: `.env` credentials not available in sandbox, and staging API is unreachable from sandbox environment
- TypeScript type check passes for changed files (no new errors)

### Key Changes in This Version

- `validateAgentRootConstraints()` now accepts `branch` and `subdirectory` params to disambiguate when multiple agent roots share the same `git_root`
- `start_session` tool passes `branch` and `subdirectory` through to validation

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., API unavailable)      |

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
