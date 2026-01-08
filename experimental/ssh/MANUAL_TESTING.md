# Manual Testing Results

This file tracks the **most recent** manual test results for the SSH MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up SSH credentials** - Ensure you have access to an SSH server for testing:

   ```bash
   # Copy from .env.example and configure your SSH settings
   cp .env.example .env
   # Edit .env with your SSH_HOST, SSH_USERNAME, etc.
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

**Test Date:** 2026-01-08
**Branch:** tadasant/ssh-mcp-server
**Commit:** 0704e67 (fix: address PR review feedback)
**Tested By:** Claude Code
**Environment:** Functional tests only (no live SSH server available)

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 22    |
| Passed      | 22    |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                         | Status                  | Tests | Notes                                           |
| ---------------------------- | ----------------------- | ----- | ----------------------------------------------- |
| `tools.test.ts` (functional) | :white_check_mark: PASS | 22/22 | All tool handlers tested with mocked SSH client |

### Detailed Results

#### ssh_execute Tests

| Test                              | Status                  | Notes                          |
| --------------------------------- | ----------------------- | ------------------------------ |
| Execute command and return result | :white_check_mark: PASS | Returns stdout/stderr/exitCode |
| Pass cwd option when provided     | :white_check_mark: PASS | Working directory properly set |
| Handle execution errors           | :white_check_mark: PASS | Returns isError: true          |
| Validate input schema             | :white_check_mark: PASS | command is required            |
| Error for missing command         | :white_check_mark: PASS | Zod validation error           |
| Error for invalid command type    | :white_check_mark: PASS | Zod validation error           |

#### ssh_upload Tests

| Test                     | Status                  | Notes                     |
| ------------------------ | ----------------------- | ------------------------- |
| Upload file successfully | :white_check_mark: PASS | SFTP upload works         |
| Handle upload errors     | :white_check_mark: PASS | Permission denied handled |
| Error for missing paths  | :white_check_mark: PASS | Zod validation error      |

#### ssh_download Tests

| Test                       | Status                  | Notes                  |
| -------------------------- | ----------------------- | ---------------------- |
| Download file successfully | :white_check_mark: PASS | SFTP download works    |
| Handle download errors     | :white_check_mark: PASS | File not found handled |
| Error for missing paths    | :white_check_mark: PASS | Zod validation error   |

#### ssh_list_directory Tests

| Test                    | Status                  | Notes                    |
| ----------------------- | ----------------------- | ------------------------ |
| List directory contents | :white_check_mark: PASS | Returns file/dir entries |
| Handle listing errors   | :white_check_mark: PASS | Directory not found      |
| Error for missing path  | :white_check_mark: PASS | Zod validation error     |

#### ssh_connection_info Tests

| Test                             | Status                  | Notes                    |
| -------------------------------- | ----------------------- | ------------------------ |
| Return connection info           | :white_check_mark: PASS | Shows host/username/port |
| Show not configured when missing | :white_check_mark: PASS | Graceful handling        |

#### Tool Schema Tests

| Test                      | Status                  | Notes                      |
| ------------------------- | ----------------------- | -------------------------- |
| executeTool schema        | :white_check_mark: PASS | name: ssh_execute          |
| uploadTool schema         | :white_check_mark: PASS | requires localPath, remote |
| downloadTool schema       | :white_check_mark: PASS | requires remotePath, local |
| listDirectoryTool schema  | :white_check_mark: PASS | requires path              |
| connectionInfoTool schema | :white_check_mark: PASS | no required params         |

### Known Issues / Limitations

- Manual tests with a real SSH server are not yet implemented
- Functional tests cover all tool handlers with mocked SSH client
- Real SSH agent authentication not tested (requires SSH server with passphrase-protected keys)

### API Behavior Notes

- SSH agent authentication is prioritized over private key file authentication
- Each tool call creates a new SSH connection and disconnects after completion
- The ssh2 library handles SSH agent communication via SSH_AUTH_SOCK

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
