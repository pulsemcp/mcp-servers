# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the 1Password MCP server.

## Overview

This is an MCP server that provides access to 1Password vaults and items via the 1Password CLI. It uses service account authentication for secure, automated access to credentials.

## Architecture

### 1Password CLI Integration

The server wraps the 1Password CLI (`op`) to interact with vaults and items:

- **Authentication**: Uses service account tokens via the `OP_SERVICE_ACCOUNT_TOKEN` environment variable
- **Commands**: Executes CLI commands with JSON output format
- **Error handling**: Maps CLI errors to typed exceptions (NotFound, Authentication, Command)

### Client Structure

```
shared/src/onepassword-client/
├── onepassword-client.ts           # Main client class
├── onepassword-client.integration-mock.ts  # Mock for integration tests
└── lib/                            # Individual CLI operations
    ├── execute-command.ts          # Core CLI execution
    ├── get-vaults.ts
    ├── get-item.ts
    ├── list-items.ts
    ├── list-items-by-tag.ts
    ├── create-login.ts
    └── create-secure-note.ts
```

### Tools

| Tool                             | Description                | Group    |
| -------------------------------- | -------------------------- | -------- |
| `onepassword_list_vaults`        | List all accessible vaults | readonly |
| `onepassword_list_items`         | List items in a vault      | readonly |
| `onepassword_get_item`           | Get full item details      | readonly |
| `onepassword_list_items_by_tag`  | Find items by tag          | readonly |
| `onepassword_create_login`       | Create a login item        | write    |
| `onepassword_create_secure_note` | Create a secure note       | write    |

## Development

### Prerequisites

- 1Password CLI (`op`) installed and in PATH
- Service account token for testing

### Running Tests

```bash
# Functional tests (no credentials needed)
npm test

# Integration tests (uses mocked CLI)
npm run test:integration

# Manual tests (requires real credentials)
npm run test:manual
```

### Adding New Operations

1. Create a new function in `shared/src/onepassword-client/lib/`
2. Add the method to `IOnePasswordClient` interface in `types.ts`
3. Implement the method in `OnePasswordClient` class
4. Add the mock implementation in `onepassword-client.integration-mock.ts`
5. Create a tool in `shared/src/tools/`
6. Register the tool in `shared/src/tools.ts`
7. Add tests in `tests/functional/` and `tests/integration/`

## Security Notes

- Service account tokens are passed via environment variables, never in command arguments
- Passwords for create operations are passed as CLI arguments (visible in process list briefly)
- All sensitive data logging is masked
- Health checks validate credentials on startup

## Development Workflow

- **Changelog Updates**: Always update CHANGELOG.md when making changes
- **Linting**: Run from repo root with `npm run lint`
- **Testing**: Run functional tests before pushing
