# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the SSH MCP Server.

## Overview

This is an MCP server for SSH remote server management with SSH agent authentication support. The key feature is seamless support for passphrase-protected SSH keys via SSH agent authentication.

## Architecture

```
ssh/
├── local/                      # Server entry point
│   └── src/
│       └── index.ts           # Main entry with env validation
├── shared/                     # Core business logic
│   └── src/
│       ├── server.ts          # Server factory with DI
│       ├── tools.ts           # Tool registration
│       ├── tools/             # Individual tool implementations
│       │   ├── execute-tool.ts
│       │   ├── upload-tool.ts
│       │   ├── download-tool.ts
│       │   ├── list-directory-tool.ts
│       │   └── connection-info-tool.ts
│       ├── ssh-client/        # SSH client implementation
│       │   ├── ssh-client.ts  # Main client with ssh2
│       │   └── ssh-client.integration-mock.ts
│       ├── resources.ts       # Resource implementations
│       └── state.ts           # State management
└── tests/                      # Test suite
    ├── functional/            # Unit tests
    └── integration/           # Full MCP protocol tests
```

## SSH Client

The SSH client (`shared/src/ssh-client/ssh-client.ts`) supports two authentication methods:

1. **SSH Agent** (recommended for passphrase-protected keys)
   - Uses `SSH_AUTH_SOCK` environment variable
   - Agent handles key decryption
   - Private key never leaves the agent

2. **Private Key File**
   - Uses `SSH_PRIVATE_KEY_PATH` environment variable
   - Optional `SSH_PASSPHRASE` for encrypted keys
   - Key is read and decrypted by the server

## Tools

| Tool                  | Group    | Operation                    |
| --------------------- | -------- | ---------------------------- |
| `ssh_connection_info` | readonly | Get connection config        |
| `ssh_list_directory`  | readonly | List remote directory (SFTP) |
| `ssh_download`        | readonly | Download file (SFTP)         |
| `ssh_upload`          | write    | Upload file (SFTP)           |
| `ssh_execute`         | admin    | Execute command              |

## Testing

```bash
# Functional tests
npm test

# Integration tests
npm run test:integration

# Manual tests (requires real SSH server)
npm run test:manual
```

## Development Workflow

- **Changelog Updates**: Always update CHANGELOG.md when making changes

## Logging

Use the logging module (`shared/src/logging.ts`), never `console.log`:

- `logServerStart(serverName)` - Server startup
- `logError(context, error)` - Errors
- `logWarning(context, message)` - Warnings
- `logDebug(context, message)` - Debug info
