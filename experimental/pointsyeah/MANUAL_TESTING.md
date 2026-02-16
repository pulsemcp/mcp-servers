# Manual Testing Results

This file tracks the **most recent** manual test results for the PointsYeah MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have the necessary credentials in your `.env` file:
   ```bash
   # Create .env in experimental/pointsyeah/ with:
   POINTSYEAH_REFRESH_TOKEN=your_refresh_token_here
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

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. This ensures we're testing the actual code that would be published

## Latest Test Results

**Test Date:** 2026-02-16 07:40 UTC
**Branch:** tadasant/pointsyeah-add-playwright-dep
**Commit:** 88a5233
**Tested By:** Claude
**Environment:** Linux, Node.js

### Test Results

**Type:** Functional tests (packaging-only change, no runtime behavior modified)
**Status:** All functional tests passed (8/8)

**Test Duration:** ~0.5s

**Details:**

This is a packaging-only change that adds `playwright` as a declared dependency in package.json (it was previously dynamically imported but not declared). No runtime code was modified. All 8 functional tests pass, confirming no regressions.

**Note:** Manual API tests from v0.1.0 (commit 7a179dd) remain valid since no runtime behavior changed. The only change is the addition of `playwright` to the `dependencies` field in `shared/package.json` and `local/package.json`.

**Summary:** Functional tests confirm no regressions from the dependency declaration change.
