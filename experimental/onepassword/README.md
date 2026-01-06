# 1Password MCP Server

MCP server for interacting with 1Password via the CLI. Enables AI assistants to securely access and manage credentials stored in 1Password vaults.

## Highlights

- **Credential unlocking via URL** - Users must explicitly share a 1Password URL to unlock an item before credentials are exposed
- Secure credential access via 1Password CLI
- Service account authentication for automation
- Read and write operations for vaults and items
- Tool grouping for permission-based access control
- Comprehensive testing setup

## Prerequisites

1. **1Password CLI (op)** - Must be installed and available in PATH
   - [Installation instructions](https://developer.1password.com/docs/cli/get-started/)

2. **1Password Service Account** - Required for authentication
   - [Create a service account](https://developer.1password.com/docs/service-accounts/)

## Capabilities

### Tools

| Tool                             | Group    | Description                                             |
| -------------------------------- | -------- | ------------------------------------------------------- |
| `onepassword_list_vaults`        | readonly | List all accessible vaults                              |
| `onepassword_list_items`         | readonly | List items in a specific vault                          |
| `onepassword_get_item`           | readonly | Get item details (credentials redacted unless unlocked) |
| `onepassword_list_items_by_tag`  | readonly | Find items by tag                                       |
| `onepassword_unlock_item`        | readonly | Unlock an item via 1Password URL for credential access  |
| `onepassword_create_login`       | write    | Create a new login credential                           |
| `onepassword_create_secure_note` | write    | Create a new secure note                                |

### Resources

| Resource               | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `onepassword://config` | Server configuration and status (for debugging) |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                      |
| ---------- | -------------------------------- |
| `readonly` | Read-only operations (list, get) |
| `write`    | Write operations (create)        |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations (safer for most use cases)
- `ENABLED_TOOLGROUPS="readonly,write"` - Full access
- Not set - All tools enabled (default)

## Quick Start

### Installation

```bash
npx onepassword-mcp-server
```

### Configuration

Set the required environment variable:

```bash
export OP_SERVICE_ACCOUNT_TOKEN="your-service-account-token"
```

### Claude Desktop Configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "onepassword": {
      "command": "npx",
      "args": ["-y", "onepassword-mcp-server"],
      "env": {
        "OP_SERVICE_ACCOUNT_TOKEN": "your-service-account-token",
        "ENABLED_TOOLGROUPS": "readonly"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Environment Variables

| Variable                   | Required | Description                         | Default     |
| -------------------------- | -------- | ----------------------------------- | ----------- |
| `OP_SERVICE_ACCOUNT_TOKEN` | Yes      | 1Password service account token     | -           |
| `ENABLED_TOOLGROUPS`       | No       | Comma-separated tool groups         | All enabled |
| `SKIP_HEALTH_CHECKS`       | No       | Skip credential validation on start | `false`     |

## Security Considerations

- **Credential Unlocking**: By default, `get_item` returns item metadata but redacts sensitive credentials. Users must explicitly share a 1Password URL via `unlock_item` to expose the actual credentials.
- **Service Account Token**: Passed via environment variable, never logged
- **CLI Arguments**: Passwords for create operations are passed as CLI arguments (briefly visible in process list)
- **Recommendation**: Use `readonly` tool group unless write access is specifically needed

### How Credential Unlocking Works

1. By default, `onepassword_get_item` returns item metadata but shows `[REDACTED - use unlock_item first]` for sensitive fields
2. To access credentials, the user must:
   - Copy the item's URL from 1Password (right-click → Copy Link)
   - Provide the URL to `onepassword_unlock_item`
3. Once unlocked, `onepassword_get_item` will return the full credentials for that item
4. Unlocked items remain accessible only for the current session (resets on server restart)

This provides an explicit consent mechanism - users must actively share a 1Password link to grant credential access.

## Development

### Project Structure

```
onepassword-mcp-server/
├── local/                 # Local server implementation
│   └── src/
│       ├── index.ts      # Main entry point
│       └── index.integration-with-mock.ts
├── shared/               # Shared business logic
│   └── src/
│       ├── server.ts     # Server factory
│       ├── tools.ts      # Tool registration
│       ├── tools/        # Individual tools
│       ├── onepassword-client/  # CLI wrapper
│       └── types.ts      # TypeScript types
├── tests/                # Test suite
│   ├── functional/       # Unit tests
│   ├── integration/      # MCP protocol tests
│   └── manual/          # Real CLI tests
└── package.json
```

### Running Locally

```bash
# Install dependencies
npm run install-all

# Build
npm run build

# Run tests
npm test

# Run integration tests
npm run test:integration
```

## License

MIT
