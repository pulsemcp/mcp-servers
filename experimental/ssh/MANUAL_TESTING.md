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

3. **Load your SSH key into the agent** (for passphrase-protected keys):

   ```bash
   ssh-add ~/.ssh/id_ed25519
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

**Test Date:** 2026-01-09
**Branch:** claude-code/ssh-health-check-startup
**Commit:** efa88ff (refactor(ssh): improve health check based on review feedback)
**Tested By:** Claude Code
**Environment:** Real SSH server (AO Production via Tailscale) with passphrase-protected key via SSH agent

> **Note:** The health check feature (0.1.1) has been verified via comprehensive functional tests covering all error hint scenarios. The core SSH functionality (connection, command execution, SFTP) was previously tested on commit 13134db and remains unchanged.

### Summary

| Metric      | Value |
| ----------- | ----- |
| Total Tests | 7     |
| Passed      | 7     |
| Failed      | 0     |
| Pass Rate   | 100%  |

### Test Files

| File                 | Status                  | Tests | Notes                               |
| -------------------- | ----------------------- | ----- | ----------------------------------- |
| `ssh.manual.test.ts` | :white_check_mark: PASS | 7/7   | All tests pass with real SSH server |

### Detailed Results

#### SSH Agent Authentication Tests

| Test                                                | Status                  | Notes                                               |
| --------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| Connect via SSH agent with passphrase-protected key | :white_check_mark: PASS | Successfully connected using SSH_AUTH_SOCK (3455ms) |

#### ssh_execute Tests

| Test                              | Status                  | Notes                                             |
| --------------------------------- | ----------------------- | ------------------------------------------------- |
| Execute command and return result | :white_check_mark: PASS | `uname -a` returned Linux raspberrypi kernel info |
| Execute command with working dir  | :white_check_mark: PASS | `pwd` with `cwd: /tmp` returned `/tmp`            |
| Handle non-zero exit codes        | :white_check_mark: PASS | `exit 42` correctly returned exitCode: 42         |

#### ssh_list_directory Tests

| Test                | Status                  | Notes                                       |
| ------------------- | ----------------------- | ------------------------------------------- |
| List /tmp directory | :white_check_mark: PASS | Returned array of files with metadata       |
| List root directory | :white_check_mark: PASS | Found standard dirs (tmp, srv, media, etc.) |

#### ssh_connection_info Tests

| Test                          | Status                  | Notes                            |
| ----------------------------- | ----------------------- | -------------------------------- |
| Return connection information | :white_check_mark: PASS | Shows host, port, username, auth |

### Test Environment Details

- **SSH Server:** AO Production (100.81.151.113 via Tailscale)
- **Server OS:** Linux raspberrypi 6.8.0-1043-raspi (Ubuntu, aarch64)
- **Authentication:** SSH agent with passphrase-protected ed25519 key
- **Connection Time:** ~3.5 seconds for first connection (includes agent auth)
- **Subsequent Connections:** ~700-900ms per operation

### Key Verification Points

1. **SSH Agent Authentication Works** - The main goal of this MCP server is to support passphrase-protected keys via SSH agent. This is verified by the first test which confirms:
   - SSH_AUTH_SOCK environment variable is properly detected
   - Connection through SSH agent succeeds
   - The passphrase-protected key (ed25519) works without exposing the passphrase

2. **Command Execution** - Commands execute correctly with proper stdout/stderr/exitCode handling

3. **SFTP Operations** - Directory listing works via SFTP protocol

4. **Connection Info** - Properly reports configured authentication methods

### Known Issues / Limitations

- File upload/download tests not included (would require write permissions and cleanup)
- Tests only run against one server (AO Production)
- Connection times are network-dependent

### API Behavior Notes

- SSH agent authentication is prioritized over private key file authentication
- Each tool call creates a new SSH connection and disconnects after completion
- The ssh2 library handles SSH agent communication via SSH_AUTH_SOCK
- Connection timeout defaults to 30 seconds

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
