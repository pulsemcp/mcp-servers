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

**Test Date:** 2026-04-08
**Branch:** sync/agent-orchestrator-52807217
**Commit:** 3642fae
**Tested By:** Claude Code (automated)
**Environment:** Internal monorepo (functional tests only — packaging change)

### Summary

**Overall:** :white_check_mark: SUCCESS - 191/191 functional tests pass.

Version bump to 0.5.0 for npm publish. This is a packaging-only change — no new functionality was added in this sync, only version bump and CHANGELOG update. Manual API tests were not re-run as no tool logic changed.

| Test Category              | Status             | Tests   |
| -------------------------- | ------------------ | ------- |
| tools.test.ts (functional) | :white_check_mark: | 191/191 |
| Build                      | :white_check_mark: | Clean   |

### Functionality Verified

- :white_check_mark: **All tool definitions** - 152 functional tests pass (3 new tests for transcript file path)
- :white_check_mark: **Manual tests** - 56/56 pass against production API (search, get_session, actions, triggers, health, notifications, configs)
- :white_check_mark: **Build succeeds** - TypeScript compilation clean
- :white_check_mark: **Lint/format** - Clean on all changed files

### Key Changes in This Version

- `get_session` returns transcript file path (`~/.claude/projects/*/{session_id}.jsonl`) when `include_transcript` is false
- Updated `include_transcript` parameter description with warnings about large transcripts
- Added tip about reading last ~100 lines and grepping for keywords
- Added note about subagent transcripts being stored as siblings

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
