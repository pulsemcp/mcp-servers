# Manual Testing Results

This file tracks the **most recent** manual test results for the Fly.io MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have your Fly.io API token in your `.env` file:

   ```bash
   # Copy from .env.example and add your real API token
   cp .env.example .env
   # Edit .env with your FLY_IO_API_TOKEN
   ```

### First-Time Setup (or after clean checkout)

If you're running manual tests for the first time or in a fresh worktree:

```bash
# This will verify environment, install dependencies, and build everything
npm run test:manual:setup
```

### Running Tests

Once setup is complete, run manual tests:

```bash
npm run test:manual
```

---

## Latest Test Results

**Test Date:** 2026-01-24
**Branch:** claude/fly-io-images-and-timeout
**Commit:** 8b9d397
**Tested By:** Claude
**Environment:** Linux, Node.js 20, Fly.io API (real credentials)

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 96    |
| Passed      | 96    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                    | Status                  | Tests | Notes                                                           |
| ----------------------- | ----------------------- | ----- | --------------------------------------------------------------- |
| `tools.test.ts`         | :white_check_mark: PASS | 83/83 | All functional tests pass with mocked client                    |
| `fly-io.manual.test.ts` | :white_check_mark: PASS | 13/13 | All manual tests pass with real API (pulsemcp-proctor-runtimes) |

### Details

This PR adds image management tools and Docker registry integration for running machines with custom images:

**New Image Management Tools:**

- `show_image` - Display current image details for an app
- `list_releases` - List release history with image information
- `update_image` - Update machines to a new Docker image

**New Docker Registry Tools (for running machines with custom images):**

- `push_new_fly_registry_image` - Push a Docker image to registry.fly.io
- `pull_fly_registry_image` - Pull an image from registry.fly.io
- `check_fly_registry_image` - Check if an image exists in registry.fly.io

**Machine Operation Fixes:**

- Fixed `fly machines run` to parse text output (no --json support)
- Fixed `fly machines status` to use listMachines + filter (no --json support)
- Fixed `fly machines destroy` (no --yes flag)
- Added 60s max timeout enforcement for exec (Fly.io API limit)

**Manual Tests Verified:**

- ✅ list_machines - Found machines in app
- ✅ create_machine - Created machine with nginx:alpine image
- ✅ get_machine - Retrieved machine details
- ✅ wait_machine - Machine reached started state
- ✅ exec_command - Command executed with 60s timeout
- ✅ stop_machine - Machine stopped successfully
- ✅ start_machine - Machine started successfully
- ✅ restart_machine - Machine restarted successfully
- ✅ delete_machine - Machine deleted successfully
- ✅ check_fly_registry_image - Registry check works
- ✅ registry validation - App name and tag validation works
- ✅ get_logs - Retrieved 100 log lines

**Input Validation:**

- App names validated (lowercase alphanumeric, hyphens, 1-63 chars)
- Docker tags validated (alphanumeric start, max 128 chars)
- Race condition fixed in Docker config backup (unique temp files)

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
