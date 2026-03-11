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
**Branch:** tadasant/add-skills-param-start-session
**Commit:** ac11400
**Tested By:** Claude Code (automated)
**Environment:** Production (https://ao.pulsemcp.com)

### Summary

**Overall:** :white_check_mark: SUCCESS - 56/56 manual tests pass, 174/174 functional tests pass.

Added `skills` parameter to `start_session` tool, mirroring `mcp_servers` pattern. Updated tool descriptions and `get_configs` usage notes.

| Test Category                 | Status             | Tests   |
| ----------------------------- | ------------------ | ------- |
| map-agent-root.test.ts        | :white_check_mark: | 2/2     |
| health-check.test.ts          | :white_check_mark: | 31/31   |
| tools.test.ts (functional)    | :white_check_mark: | 141/141 |
| Manual tests (production API) | :white_check_mark: | 56/56   |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 141 functional tests pass (4 new tests for skills parameter)
- :white_check_mark: **Manual tests** - 56/56 pass against production API (start_session, get_configs, search, actions, triggers, health, notifications)
- :white_check_mark: **mapAgentRoot mapping** - 2/2 tests pass
- :white_check_mark: **Health check** - 31/31 tests pass
- :white_check_mark: **Build succeeds** - TypeScript compilation clean

### Key Changes in This Version

- Added `skills` parameter to `start_session` (schema, inputSchema, type, description)
- Updated `start_session` description with defaults guidance for agent roots
- Added skills usage note to `get_configs` output
- Skills are NOT constrained by `ALLOWED_AGENT_ROOTS` (unlike `mcp_servers`)

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
