# 1Password MCP Server

MCP server for interacting with 1Password via the CLI. Enables AI assistants to securely access and manage credentials stored in 1Password vaults.

## Highlights

- **Elicitation-based approval** - Users are prompted for confirmation before credentials are revealed or items are created
- **Configurable per-action** - Enable/disable elicitation independently for read and write operations
- **Item whitelisting** - Pre-approve specific items to bypass elicitation prompts
- Secure credential access via 1Password CLI
- Service account authentication for automation
- Read and write operations for vaults and items
- Tool grouping for permission-based access control

## Prerequisites

1. **1Password CLI (op)** - Must be installed and available in PATH
   - [Installation instructions](https://developer.1password.com/docs/cli/get-started/)

2. **1Password Service Account** - Required for authentication
   - [Create a service account](https://developer.1password.com/docs/service-accounts/)

## Capabilities

### Tools

| Tool                             | Group    | Description                                               |
| -------------------------------- | -------- | --------------------------------------------------------- |
| `onepassword_list_vaults`        | readonly | List all accessible vaults                                |
| `onepassword_list_items`         | readonly | List items in a specific vault                            |
| `onepassword_get_item`           | readonly | Get item details (credentials require approval to reveal) |
| `onepassword_list_items_by_tag`  | readonly | Find items by tag                                         |
| `onepassword_create_login`       | write    | Create a new login credential (requires approval)         |
| `onepassword_create_secure_note` | write    | Create a new secure note (requires approval)              |

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

| Variable                        | Required | Description                                                            | Default                        |
| ------------------------------- | -------- | ---------------------------------------------------------------------- | ------------------------------ |
| `OP_SERVICE_ACCOUNT_TOKEN`      | Yes      | 1Password service account token                                        | -                              |
| `ENABLED_TOOLGROUPS`            | No       | Comma-separated tool groups                                            | All enabled                    |
| `SKIP_HEALTH_CHECKS`            | No       | Skip credential validation on start                                    | `false`                        |
| `DANGEROUSLY_SKIP_ELICITATIONS` | No       | Set to `true` to bypass ALL confirmation prompts (exposes all secrets) | not set (elicitation required) |
| `OP_ELICITATION_READ`           | No       | Prompt before revealing credentials                                    | `true`                         |
| `OP_ELICITATION_WRITE`          | No       | Prompt before creating items                                           | `true`                         |
| `OP_WHITELISTED_ITEMS`          | No       | Comma-separated item titles or IDs that bypass read elicitation        | none                           |

## Security Considerations

- **Startup safety check**: The server refuses to start unless elicitation is configured (HTTP fallback URLs) or explicitly opted out via `DANGEROUSLY_SKIP_ELICITATIONS=true`. This prevents accidental carte blanche access to all secrets.
- **Elicitation-based approval**: By default, `get_item` prompts the user for confirmation before revealing sensitive credentials. Write operations also require approval.
- **Service Account Token**: Passed via environment variable, never logged
- **CLI Arguments**: Passwords for create operations are passed as CLI arguments (briefly visible in process list)
- **Recommendation**: Use `readonly` tool group unless write access is specifically needed

### How Credential Approval Works

1. By default, `onepassword_get_item` returns item metadata but shows `[REDACTED]` for sensitive fields
2. The server prompts the user to approve credential access via elicitation
3. Once approved, the full credentials are returned for that request
4. Whitelisted items (via `OP_WHITELISTED_ITEMS`, matched by title or item ID) bypass the approval prompt entirely

### Configuration Examples

**Disable all confirmations** (fully automated workflows):

```bash
DANGEROUSLY_SKIP_ELICITATIONS=true
```

**Only confirm writes, auto-approve reads**:

```bash
OP_ELICITATION_READ=false
OP_ELICITATION_WRITE=true
```

**Whitelist specific items by title or ID** (always auto-approve these):

```bash
OP_WHITELISTED_ITEMS="Stripe Key,AWS Credentials,abc123def456"
```

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
