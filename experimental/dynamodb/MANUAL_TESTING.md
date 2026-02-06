# Manual Testing Results

This file tracks the **most recent** manual test results for the DynamoDB MCP server.

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
   # Copy from .env.example and add your real credentials
   cp .env.example .env
   # Edit .env with your AWS credentials
   ```

   Required environment variables:
   - `AWS_REGION`: AWS region (e.g., us-east-1)
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

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

To run a specific test file:

```bash
npm run test:manual -- tests/manual/dynamodb.manual.test.ts
```

The tests will:

1. Build the project first (compiles TypeScript to JavaScript)
2. Run tests against the built JavaScript code (not source TypeScript)
3. Create and delete a temporary test table in DynamoDB
4. Test all CRUD operations against real AWS DynamoDB

---

## Latest Test Results

**Test Date:** 2026-02-06
**Branch:** ao/dynamodb-mcp-server
**Commit:** 15e92671fc99c0e2cc0d61a704962de05332b7f9
**Tested By:** Agent Orchestrator
**Environment:** AWS us-east-1 (test account)

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 9     |
| Passed      | 9     |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                      | Status             | Tests | Notes                                      |
| ------------------------- | ------------------ | ----- | ------------------------------------------ |
| `dynamodb.manual.test.ts` | :white_check_mark: | 9/9   | All tests passed against real AWS DynamoDB |

### Detailed Results

#### Read-only Operations

| Test        | Status             | Notes                      |
| ----------- | ------------------ | -------------------------- |
| List tables | :white_check_mark: | Successfully listed tables |

#### Table Management

| Test           | Status             | Notes                                                |
| -------------- | ------------------ | ---------------------------------------------------- |
| Create table   | :white_check_mark: | Successfully created test table with PAY_PER_REQUEST |
| Describe table | :white_check_mark: | Retrieved table details including key schema         |
| Delete table   | :white_check_mark: | Successfully deleted test table                      |

#### Item Operations

| Test        | Status             | Notes                                      |
| ----------- | ------------------ | ------------------------------------------ |
| Put item    | :white_check_mark: | Successfully wrote item to table           |
| Get item    | :white_check_mark: | Successfully retrieved item by primary key |
| Update item | :white_check_mark: | Successfully updated item attributes       |
| Delete item | :white_check_mark: | Successfully deleted item                  |
| Scan table  | :white_check_mark: | Successfully scanned table for items       |

### Known Issues / Limitations

- Manual tests require valid AWS credentials with DynamoDB permissions
- Tests create and delete a temporary table (mcp-test-\*) during execution

### API Behavior Notes

- Table creation is asynchronous; tests include 10s wait time for table to become ACTIVE before item operations
- All item operations use PAY_PER_REQUEST billing mode for test tables

---

## Test Result Status Legend

| Icon                    | Meaning                                   |
| ----------------------- | ----------------------------------------- |
| :white_check_mark: PASS | Test passed successfully                  |
| :x: FAIL                | Test failed - needs investigation         |
| :warning: WARN          | Test passed with warnings or known issues |
| :hourglass: SKIP        | Test skipped (e.g., credentials missing)  |

---

## CI Verification

This file is checked by CI during version bumps. The CI workflow verifies:

1. Manual tests were run on a commit in the PR's history
2. The commit hash in this file matches a commit in the PR
3. Tests show passing results

**Important:** Always update this file after running manual tests and before creating a version bump.
