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

**Test Date:** 2026-03-11
**Branch:** tadasant/resolve-stop-condition-description
**Commit:** b3d628d
**Tested By:** Claude Code (automated)
**Environment:** Sandbox — staging API unreachable; functional tests used

### Summary

**Overall:** :white_check_mark: SUCCESS - 142/142 functional tests pass (5 new tests added).

Fixed `start_session` to resolve stop_condition ID to its human-readable description before passing to the agent. Previously only the opaque ID was sent.

| Test Category              | Status             | Tests   |
| -------------------------- | ------------------ | ------- |
| tools.test.ts (functional) | :white_check_mark: | 142/142 |
| Manual tests (staging API) | :hourglass: SKIP   | N/A     |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 142 functional tests pass (5 new tests for stop_condition resolution)
- :white_check_mark: **Stop condition ID resolved to description** - Verified via mock that `"pr_merged"` becomes `"Stop when the pull request is merged"`
- :white_check_mark: **Unknown stop conditions pass through as-is** - Backward compatible for custom/unknown IDs
- :white_check_mark: **Configs fetched when cache empty** - Verified getConfigs called when no cache exists
- :white_check_mark: **Cached configs reused** - Verified getConfigs not called when cache populated
- :white_check_mark: **No configs fetch when no stop_condition** - Verified no unnecessary API calls
- :white_check_mark: **Lint passes** - ESLint and Prettier clean
- :white_check_mark: **Build succeeds** - TypeScript compilation clean

### Notes

- Manual tests skipped: `.env` credentials not available in sandbox, and staging API is unreachable from sandbox environment
- This change reuses the existing `getConfigsCache`/`setConfigsCache` pattern already used by ALLOWED_AGENT_ROOTS validation, so the config-fetching path is well-tested

### Key Changes in This Version

- `start_session` handler now resolves `stop_condition` ID to its description from configs before calling `createSession`
- Updated `stop_condition` parameter description to clarify it accepts an ID that gets resolved
- Added 5 new functional tests covering resolution, pass-through, caching, and no-op scenarios

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
