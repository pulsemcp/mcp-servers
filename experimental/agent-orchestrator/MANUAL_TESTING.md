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

**Test Date:** 2026-02-21
**Branch:** ao-agent/add-toolgroups
**Commit:** ad0b4eb
**Tested By:** Claude Code (automated)
**Environment:** Production (ao.pulsemcp.com) + CI unit/integration tests

### Summary

**Overall:** :white_check_mark: SUCCESS - All 56 manual tests pass, 115 functional tests pass, 14 integration tests pass. Added 7 new tools (13 total) across 4 domains with comprehensive API coverage.

| Test Category                 | Status             | Tests   |
| ----------------------------- | ------------------ | ------- |
| **Manual Tests (Production)** |                    |         |
| Tool Registration             | :white_check_mark: | 1/1     |
| search_sessions               | :white_check_mark: | 4/4     |
| get_session                   | :white_check_mark: | 6/6     |
| start_session                 | :white_check_mark: | 1/1     |
| action_session                | :white_check_mark: | 11/11   |
| manage_enqueued_messages      | :white_check_mark: | 8/8     |
| get_configs                   | :white_check_mark: | 1/1     |
| get_notifications             | :white_check_mark: | 3/3     |
| send_push_notification        | :white_check_mark: | 2/2     |
| action_notification           | :white_check_mark: | 4/4     |
| search_triggers               | :white_check_mark: | 3/3     |
| action_trigger                | :white_check_mark: | 4/4     |
| get_system_health             | :white_check_mark: | 2/2     |
| action_health                 | :white_check_mark: | 4/4     |
| Resources                     | :white_check_mark: | 2/2     |
| **Functional Tests (CI)**     |                    |         |
| All functional tests          | :white_check_mark: | 115/115 |
| **Integration Tests (CI)**    |                    |         |
| All integration tests         | :white_check_mark: | 14/14   |

### Functionality Verified

- :white_check_mark: **searchSessionsWorks** - List, filter, search sessions
- :white_check_mark: **getSessionWorks** - Get detailed session info
- :white_check_mark: **getSessionWithLogsWorks** - Get session with logs/transcripts
- :white_check_mark: **getSessionTranscriptFormatWorks** - Transcript via dedicated endpoint (text/json)
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

### Warnings

- `transcript_format`: Test session had no transcript available (API returned 404) - expected behavior for sessions without transcripts
- `refresh`: Test session had no clone path (API returned 422) - expected for newly created clone-only sessions

### Key Changes (Unreleased)

- Added 7 new tools (13 total): manage_enqueued_messages, get_notifications, action_notification, search_triggers, action_trigger, get_system_health, action_health
- Extended action_session with 6 new actions: fork, refresh, refresh_all, update_notes, toggle_favorite, bulk_archive
- Extended get_session with transcript_format parameter
- Added 2 new tool groups: triggers/triggers_readonly, health/health_readonly
- Replaced ENABLED_TOOLGROUPS with TOOL_GROUPS env var
- Replaced permission-based groups with domain-specific groups

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
