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

2. **Set up API credentials** (optional) - For full testing, add credentials to `.env`:
   ```bash
   # Create .env in experimental/pointsyeah/ with:
   POINTSYEAH_REFRESH_TOKEN=your_refresh_token_here
   ```
   Note: Unauthenticated tests always run. Auth-dependent tests are properly skipped (via `ctx.skip()`) when no valid token is available.

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

**Test Date:** 2026-02-22
**Branch:** tadasant/fix-pointsyeah-format-null-routes
**Commit:** e308376
**Tested By:** Claude
**Environment:** Linux, Node.js

### Manual Test Results

**Status:** Not re-run (no changes to MCP server startup or tool registration)

The formatting fix only affects `formatRoute` and `formatResult` helper functions in `search-flights.ts`. Manual tests cover tool registration, authentication, and config resources — none of which are affected by this change.

### End-to-End Verification

Bug was reproduced via MCP tool invocation against published v0.2.5:

- One-way search (SFO→NYC, tripType "1") crashed with `Cannot read properties of null (reading 'length')` at `formatRoute` in `search-flights.js:47:18`
- Stack trace confirmed the crash was in the formatting layer accessing `transfer.length` when `transfer` is null
- Fix adds defensive null guards (`??`, `&&`, early return) in `formatRoute` and `formatResult` — the fix was verified via new functional tests (not re-tested end-to-end against the live API)

### Functional Test Results

**Status:** All functional tests passed, all integration tests passed

**Summary:** New functional tests added for null `routes`, null `payment`/`segments`/`transfer` fields. Formatting null guard fix verified via functional tests covering the exact null shapes returned by the live API.
