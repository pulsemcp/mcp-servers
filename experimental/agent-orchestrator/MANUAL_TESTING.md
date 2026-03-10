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
**Branch:** tadasant/clarify-subdirectory-description
**Commit:** 7fe0577
**Tested By:** Claude Code (automated)
**Environment:** Sandbox — staging API unreachable; functional tests used

### Summary

**Overall:** :white_check_mark: SUCCESS - 159/159 functional tests pass.

This change is description-only — the `subdirectory` parameter description in `start_session` was updated to clarify its intended use. No code logic, API client code, or tool behavior was modified. Functional tests verify all tool definitions and parameter schemas are correctly formed.

| Test Category              | Status             | Tests   |
| -------------------------- | ------------------ | ------- |
| tools.test.ts              | :white_check_mark: | 126/126 |
| health-check.test.ts       | :white_check_mark: | 31/31   |
| map-agent-root.test.ts     | :white_check_mark: | 2/2     |
| Manual tests (staging API) | :hourglass: SKIP   | N/A     |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 126 tool tests pass, including start_session parameter schema validation
- :white_check_mark: **Health check logic** - 31 tests pass unchanged
- :white_check_mark: **Agent root mapping** - 2 tests pass unchanged

### Notes

- Manual tests skipped: `.env` credentials not available in sandbox, and staging API is unreachable from sandbox environment
- This is a description-only change (tool parameter text) — no runtime behavior was modified
- Analogous to v0.2.4 which was also a parameter description update

### Key Changes in This Version

- Improved `subdirectory` parameter description in `start_session` to clarify it should match preconfigured agent root defaults, not point at internal monorepo directories

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
