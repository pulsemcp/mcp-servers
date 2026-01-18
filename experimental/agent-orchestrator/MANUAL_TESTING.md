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

3. **Start Agent Orchestrator** - The agent-orchestrator API must be running locally:
   ```bash
   # In the agent-orchestrator directory
   bin/rails server
   ```

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

**Test Date:** 2026-01-18
**Branch:** tadasant/agent-orchestrator-unified-configs
**Commit:** 0fbe3c0
**Tested By:** Claude Code (automated)
**Environment:** CI, unit tests and integration tests

### Summary

**Overall:** :white_check_mark: SUCCESS - All 61 functional tests pass, 9 integration tests pass (100%)

| Test Category             | Status             | Tests |
| ------------------------- | ------------------ | ----- |
| Tool Registration         | :white_check_mark: | 1/1   |
| search_sessions           | :white_check_mark: | 4/4   |
| get_session               | :white_check_mark: | 5/5   |
| start_session             | :white_check_mark: | 1/1   |
| action_session            | :white_check_mark: | 7/7   |
| Health Check              | :white_check_mark: | 31/31 |
| get_available_mcp_servers | :white_check_mark: | 5/5   |
| get_configs               | :white_check_mark: | 6/6   |
| Integration Tests         | :white_check_mark: | 9/9   |

### Functionality Verified

- :white_check_mark: **searchSessionsWorks** - List, filter, search sessions
- :white_check_mark: **getSessionWorks** - Get detailed session info
- :white_check_mark: **getSessionWithLogsWorks** - Get session with logs/transcripts
- :white_check_mark: **startSessionWorks** - Create new sessions
- :white_check_mark: **actionSessionWorks** - Archive/unarchive sessions
- :white_check_mark: **changeMcpServersWorks** - Update MCP servers for a session
- :white_check_mark: **healthCheckWorks** - API connectivity health check on startup
- :white_check_mark: **getConfigsWorks** - Fetch all static configs (MCP servers, agent roots, stop conditions)
- :white_check_mark: **sharedCacheWorks** - Cache sharing between get_configs and get_available_mcp_servers

### Test Details

**6-tool interface:**

- `search_sessions` - Search/list sessions with optional ID lookup
- `get_session` - Get detailed session info with optional logs/transcripts
- `start_session` - Create and start a new session
- `action_session` - Perform actions (follow_up, pause, restart, archive, unarchive, change_mcp_servers)
- `get_available_mcp_servers` - List available MCP servers (now uses unified configs endpoint)
- `get_configs` - Fetch all static configuration in a single call (NEW in 0.2.0)

**New in 0.2.0:**

- Added `get_configs` tool for unified static configuration access
- Updated `get_available_mcp_servers` to use unified `/api/v1/configs` endpoint
- Implemented shared caching between config tools
- Functional tests: 61 pass, Integration tests: 9 pass

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
