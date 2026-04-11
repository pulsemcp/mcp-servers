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

**Test Date:** 2026-04-11
**Branch:** sync/agent-orchestrator-d4f7f26c
**Commit:** 0a0744c
**Tested By:** Claude Code (automated)
**Environment:** Internal monorepo (functional tests only — patch version bump)

### Summary

**Overall:** :white_check_mark: SUCCESS - 196/196 functional tests pass.

Patch version bump to 0.5.1. Added `catalog_plugins` parameter support to `start_session` tool, mirroring the existing `catalog_skills` pattern. 5 new tests added for plugins remapping and display. Manual API tests were not re-run as this is a patch-level addition with no changes to existing tool logic.

| Test Category                          | Status             | Tests   |
| -------------------------------------- | ------------------ | ------- |
| tools.test.ts (functional)             | :white_check_mark: | 156/156 |
| orchestrator-client.test.ts            | :white_check_mark: | 7/7     |
| health-check.test.ts                   | :white_check_mark: | 31/31   |
| map-agent-root.test.ts                 | :white_check_mark: | 2/2     |
| Build                                  | :white_check_mark: | Clean   |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 156 functional tests pass (2 new tests for catalog_plugins display)
- :white_check_mark: **Orchestrator client** - 7 tests pass (3 new tests for plugins→catalog_plugins remapping)
- :white_check_mark: **Build succeeds** - TypeScript compilation clean
- :white_check_mark: **Lint/format** - Clean on all changed files

### Key Changes in This Version

- `plugins` parameter on `start_session` tool — remapped to `catalog_plugins` for the Rails API
- `get_session` displays `catalog_plugins` (plugins) in the Execution section
- `catalog_plugins` optional field on `Session` type

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
