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

**Test Date:** 2026-02-23
**Branch:** tadasant/quick-search-sessions
**Commit:** d6fd530
**Tested By:** Claude Code (automated)
**Environment:** Production API (ao.pulsemcp.com)

### Summary

**Overall:** :white_check_mark: SUCCESS - 56/56 manual tests pass against production API.

| Test Category            | Status             | Tests |
| ------------------------ | ------------------ | ----- |
| Tool Registration        | :white_check_mark: | 1/1   |
| quick_search_sessions    | :white_check_mark: | 4/4   |
| get_session              | :white_check_mark: | 6/6   |
| start_session            | :white_check_mark: | 1/1   |
| action_session           | :white_check_mark: | 11/11 |
| manage_enqueued_messages | :white_check_mark: | 8/8   |
| get_configs              | :white_check_mark: | 1/1   |
| get_notifications        | :white_check_mark: | 3/3   |
| send_push_notification   | :white_check_mark: | 2/2   |
| action_notification      | :white_check_mark: | 4/4   |
| search_triggers          | :white_check_mark: | 3/3   |
| action_trigger           | :white_check_mark: | 4/4   |
| get_system_health        | :white_check_mark: | 2/2   |
| action_health            | :white_check_mark: | 4/4   |
| Resources                | :white_check_mark: | 2/2   |

### Functionality Verified

- :white_check_mark: **searchSessionsWorks** - List, filter, search sessions by title
- :white_check_mark: **getSessionWorks** - Get detailed session info
- :white_check_mark: **getSessionWithLogsWorks** - Get session with logs/transcripts
- :white_check_mark: **getSessionTranscriptFormatWorks** - Get session transcript with text format
- :white_check_mark: **startSessionWorks** - Create new sessions
- :white_check_mark: **actionSessionWorks** - Archive/unarchive sessions
- :white_check_mark: **actionSessionNewActionsWork** - update_notes, toggle_favorite, refresh, refresh_all
- :white_check_mark: **manageEnqueuedMessagesWorks** - Full CRUD for session message queue
- :white_check_mark: **getConfigsWorks** - Fetch all static configs (MCP servers, agent roots, stop conditions)
- :white_check_mark: **sendPushNotificationWorks** - Send push notifications about sessions needing attention
- :white_check_mark: **getNotificationsWorks** - Badge count, list, filter notifications
- :white_check_mark: **actionNotificationWorks** - Mark all read, dismiss all read, validation
- :white_check_mark: **searchTriggersWorks** - List triggers with optional channels
- :white_check_mark: **actionTriggerWorks** - Validation for create/update/delete/toggle
- :white_check_mark: **getSystemHealthWorks** - Health report and CLI status
- :white_check_mark: **actionHealthWorks** - Cleanup processes, archive old, CLI refresh/clear cache

### Notes

- `refresh`: Test session had no clone path (API returned 422) — expected for newly created clone-only sessions.
- Tool registration test expects 14 tools to account for `get_transcript_archive` added in v0.2.5.

### Key Changes in This Version

- **BREAKING:** Renamed `search_sessions` tool to `quick_search_sessions`
- Removed `search_contents` parameter (consistently errored due to data volume)
- Updated tool description to clearly communicate title-only search scope
- Fixed `getTranscript` to handle raw text response when `format=text` (API returns plain text, not JSON)

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
