# Manual Testing Results

This file tracks the **most recent** manual test results for the S3 MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up AWS credentials** - Ensure you have the necessary credentials in your `.env` file:

   ```bash
   # Copy from .env.example and add your real AWS keys
   cp .env.example .env
   # Edit .env with your credentials
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

**Test Date:** 2026-02-05
**Branch:** tadasant/s3-mcp-server
**Commit:** 57c290823b66b8c05bef9029163cbec8cebc0660
**Tested By:** Claude Opus 4.5
**Environment:** Node.js on Linux, AWS us-east-1

### Summary

**Overall:** 9/9 tests passed (100%)

All manual tests passed successfully against a real AWS S3 account.

### Test Results

| Test          | Result                  | Notes                                  |
| ------------- | ----------------------- | -------------------------------------- |
| List buckets  | :white_check_mark: PASS | Found 0 buckets (clean account)        |
| Create bucket | :white_check_mark: PASS | Created mcp-s3-test-\* bucket          |
| Head bucket   | :white_check_mark: PASS | Verified bucket exists                 |
| Put object    | :white_check_mark: PASS | Uploaded test-folder/test-file.json    |
| List objects  | :white_check_mark: PASS | Listed 1 object with prefix filter     |
| Get object    | :white_check_mark: PASS | Retrieved object content correctly     |
| Copy object   | :white_check_mark: PASS | Copied to test-folder/copied-file.json |
| Delete object | :white_check_mark: PASS | Deleted test-folder/test-file.json     |
| Delete bucket | :white_check_mark: PASS | Cleaned up test bucket                 |

### Test Duration

Total: 2.85s (tests: 2.21s)

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
