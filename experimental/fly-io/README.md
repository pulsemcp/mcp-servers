# Fly.io MCP Server

MCP server for managing Fly.io machines and applications. This server provides tools for CRUD operations on Fly.io apps and machines (VMs).

## Highlights

- Manage Fly.io applications and machines via MCP
- Full CRUD operations for apps and machines
- Start, stop, and update running machines
- Deploy Docker images to Fly.io
- Tool grouping for permission-based access control
- Health checks for API credential validation

## Capabilities

### Tools

| Tool             | Group                  | Description                              |
| ---------------- | ---------------------- | ---------------------------------------- |
| `list_apps`      | readonly, write, admin | List all Fly.io applications             |
| `get_app`        | readonly, write, admin | Get details for a specific app           |
| `create_app`     | write, admin           | Create a new Fly.io application          |
| `delete_app`     | admin                  | Delete an application                    |
| `list_machines`  | readonly, write, admin | List all machines in an app              |
| `get_machine`    | readonly, write, admin | Get details for a specific machine       |
| `create_machine` | write, admin           | Create a new machine with a Docker image |
| `update_machine` | write, admin           | Update a machine's configuration         |
| `delete_machine` | admin                  | Delete a machine                         |
| `start_machine`  | write, admin           | Start a stopped machine                  |
| `stop_machine`   | write, admin           | Stop a running machine                   |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                                      |
| ---------- | ------------------------------------------------ |
| `readonly` | Read-only operations (list, get)                 |
| `write`    | Write operations (create, update, start, stop)   |
| `admin`    | Administrative operations (delete apps/machines) |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `ENABLED_TOOLGROUPS="readonly,write"` - Read and write, no delete
- Not set - All tools enabled (default)

## Quick Start

### Prerequisites

1. A Fly.io account - [Sign up at fly.io](https://fly.io)
2. A Fly.io API token - [Create one here](https://fly.io/user/personal_access_tokens)
3. Node.js 18+ installed

### Configuration

#### Environment Variables

| Variable             | Required | Description                           | Default     |
| -------------------- | -------- | ------------------------------------- | ----------- |
| `FLY_IO_API_TOKEN`   | Yes      | API token for Fly.io authentication   | -           |
| `FLY_IO_APP_NAME`    | No       | Scope operations to a specific app    | all apps    |
| `ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups to enable | All enabled |
| `SKIP_HEALTH_CHECKS` | No       | Skip API validation at startup        | `false`     |

### Claude Desktop Configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fly-io": {
      "command": "npx",
      "args": ["-y", "fly-io-mcp-server"],
      "env": {
        "FLY_IO_API_TOKEN": "fo_your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Usage Examples

### List all apps

```
Use the list_apps tool to see all my Fly.io applications.
```

### Create a new app and deploy a machine

```
Create a new Fly.io app called "my-web-app" in my personal organization,
then deploy an nginx container to it with 512MB of RAM.
```

### Scale machines

```
List the machines in my-web-app and create two more copies
in different regions (lax and lhr).
```

### Update a deployment

```
Update all machines in my-web-app to use the nginx:1.25 image.
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/pulsemcp/mcp-servers.git
cd mcp-servers/experimental/fly-io

# Install dependencies
npm run install-all

# Build
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Testing

```bash
# Run functional tests in watch mode
npm test

# Run tests once
npm run test:run

# Run integration tests
npm run test:integration

# Run manual tests (requires .env with API token)
npm run test:manual:setup  # First time only
npm run test:manual
```

### Linting and Formatting

```bash
# Check for linting issues (run from repo root)
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## API Reference

This server uses the [Fly.io Machines API](https://fly.io/docs/machines/api/).

### Rate Limits

The Fly.io API enforces rate limiting:

- General: 1 request/second/action (burst: 3 req/s)
- Get Machine: 5 req/s (burst: 10 req/s)
- Delete App: 100/minute

## Project Structure

```
fly-io/
├── local/                 # Local server implementation
│   ├── src/
│   │   ├── index.ts      # Main entry point
│   │   └── index.integration-with-mock.ts
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory
│   │   ├── tools.ts      # Tool registration
│   │   ├── tools/        # Individual tool implementations
│   │   ├── fly-io-client/  # Fly.io API client
│   │   │   └── lib/      # API method implementations
│   │   ├── logging.ts
│   │   └── types.ts
│   └── package.json
├── tests/
│   ├── functional/       # Unit tests with mocks
│   ├── integration/      # MCP protocol tests
│   ├── manual/          # Real API tests
│   └── mocks/
├── scripts/
├── package.json
└── README.md
```

## License

MIT
