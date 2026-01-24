# Fly.io MCP Server

MCP server for managing Fly.io machines and applications. This server provides tools for CRUD operations on Fly.io apps and machines (VMs).

## Highlights

- Manage Fly.io applications and machines via MCP
- Full CRUD operations for apps and machines
- Start, stop, restart, and suspend machines
- Get machine event logs for debugging
- Wait for machine state transitions
- Deploy Docker images to Fly.io
- **Retrieve application logs** with region and machine filtering
- **Execute commands on running machines**
- **Manage Docker images** - view current image, list releases, update to new versions
- **Push/pull images to Fly.io registry** - interact with registry.fly.io directly
- Tool grouping for permission-based access control
- Health checks for API credential and CLI tool validation

## Capabilities

### Tools

| Tool                          | Permissions            | Feature  | Description                                 |
| ----------------------------- | ---------------------- | -------- | ------------------------------------------- |
| `list_apps`                   | readonly, write, admin | apps     | List all Fly.io applications                |
| `get_app`                     | readonly, write, admin | apps     | Get details for a specific app              |
| `create_app`                  | write, admin           | apps     | Create a new Fly.io application             |
| `delete_app`                  | admin                  | apps     | Delete an application                       |
| `list_machines`               | readonly, write, admin | machines | List all machines in an app                 |
| `get_machine`                 | readonly, write, admin | machines | Get details for a specific machine          |
| `get_machine_events`          | readonly, write, admin | machines | Get event log for a machine (for debugging) |
| `create_machine`              | write, admin           | machines | Create a new machine with a Docker image    |
| `update_machine`              | write, admin           | machines | Update a machine's configuration            |
| `delete_machine`              | admin                  | machines | Delete a machine                            |
| `start_machine`               | write, admin           | machines | Start a stopped machine                     |
| `stop_machine`                | write, admin           | machines | Stop a running machine                      |
| `restart_machine`             | write, admin           | machines | Restart a machine (stop then start)         |
| `suspend_machine`             | write, admin           | machines | Suspend a machine (save state to disk)      |
| `wait_machine`                | write, admin           | machines | Wait for a machine to reach a state         |
| `get_logs`                    | readonly, write, admin | logs     | Get application logs                        |
| `machine_exec`                | write, admin           | ssh      | Execute a command on a machine              |
| `show_image`                  | readonly, write, admin | images   | Show current Docker image details           |
| `list_releases`               | readonly, write, admin | images   | List releases with image references         |
| `update_image`                | write, admin           | images   | Update app's image to latest or specific    |
| `push_new_fly_registry_image` | write, admin           | registry | Push local image to Fly.io registry         |
| `pull_fly_registry_image`     | readonly, write, admin | registry | Pull image from Fly.io registry             |
| `check_fly_registry_image`    | readonly, write, admin | registry | Check if image exists in registry           |

### Security Considerations

The `machine_exec` tool allows executing arbitrary commands on Fly.io machines. This is a powerful capability that should be used with caution:

- Consider using `ENABLED_TOOLGROUPS="readonly"` or `ENABLED_TOOLGROUPS="readonly,write"` to disable administrative tools including `machine_exec`
- The server requires the `fly` CLI to be installed, which means it has access to execute shell commands
- All operations are authenticated via your `FLY_IO_API_TOKEN`

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable. Two types of groups are supported and can be combined:

#### Permission Groups (what operations are allowed)

| Group      | Description                                      |
| ---------- | ------------------------------------------------ |
| `readonly` | Read-only operations (list, get)                 |
| `write`    | Write operations (create, update, start, stop)   |
| `admin`    | Administrative operations (delete apps/machines) |

#### Feature Groups (what features are enabled)

| Group      | Description                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps`     | App management tools (list_apps, get_app, create_app, delete_app)                                                            |
| `machines` | Machine management tools (list, get, create, update, delete, start, stop)                                                    |
| `logs`     | Log retrieval tools (get_logs)                                                                                               |
| `ssh`      | Remote execution tools (machine_exec)                                                                                        |
| `images`   | Image management tools (show_image, list_releases, update_image)                                                             |
| `registry` | Docker registry tools (push_new_fly_registry_image, pull_fly_registry_image, check_fly_registry_image) - requires Docker CLI |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations (all features)
- `ENABLED_TOOLGROUPS="readonly,write"` - Read and write, no delete (all features)
- `ENABLED_TOOLGROUPS="machines,logs"` - All permissions, only machines and logs features
- `ENABLED_TOOLGROUPS="readonly,machines"` - Read-only access to machines only
- Not set - All tools enabled (default)

### App Scoping

When `FLY_IO_APP_NAME` is set, the server operates in "scoped mode":

- **App management tools are disabled**: `list_apps`, `get_app`, `create_app`, `delete_app` are not available
- **Machine tools are restricted**: All machine operations only work on the configured app
- **app_name becomes optional**: Machine tools will automatically use the scoped app
- **Cross-app operations are blocked**: Attempting to operate on a different app returns an error

This is useful for:

- Restricting access to a single application
- Simplifying tool usage (no need to specify app_name)
- Preventing accidental operations on wrong apps

## Quick Start

### Prerequisites

1. A Fly.io account - [Sign up at fly.io](https://fly.io)
2. A Fly.io API token - [Create one here](https://fly.io/user/personal_access_tokens)
3. **Fly.io CLI (`fly`) installed** - [Install instructions](https://fly.io/docs/hands-on/install-flyctl/)
4. **Docker CLI installed** (optional) - Required for registry tools (`push_image`, `pull_image`, `check_registry_image`)
5. Node.js 18+ installed

### Configuration

#### Environment Variables

| Variable                   | Required | Description                                            | Default     |
| -------------------------- | -------- | ------------------------------------------------------ | ----------- |
| `FLY_IO_API_TOKEN`         | Yes      | API token for Fly.io authentication                    | -           |
| `FLY_IO_APP_NAME`          | No       | Scope server to a single app (disables app management) | -           |
| `ENABLED_TOOLGROUPS`       | No       | Comma-separated tool groups to enable                  | All enabled |
| `SKIP_HEALTH_CHECKS`       | No       | Skip API validation at startup                         | `false`     |
| `DISABLE_DOCKER_CLI_TOOLS` | No       | Disable Docker-based registry tools                    | `false`     |

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

**With app scoping** (restricts to a single app):

```json
{
  "mcpServers": {
    "fly-io": {
      "command": "npx",
      "args": ["-y", "fly-io-mcp-server"],
      "env": {
        "FLY_IO_API_TOKEN": "fo_your_token_here",
        "FLY_IO_APP_NAME": "my-production-app"
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

### Debug a crashed machine

```
Get the events for machine abc123 in my-web-app to see why it crashed.
```

### Restart a stuck machine

```
Restart machine abc123 in my-web-app to clear its state.
```

### View application logs

```
Get the logs for my-web-app to see what's happening.
```

### Execute a command on a machine

```
Run "ls -la /app" on machine abc123 in my-web-app to see the app files.
```

### Check current image version

```
Show me the current Docker image details for my-web-app.
```

### List deployment history

```
List the last 5 releases for my-web-app to see the deployment history.
```

### Update to a new image

```
Update my-web-app to use the latest image version.
```

### Push a local image to Fly.io registry

```
Push my local "my-app:v2" image to the Fly.io registry for my-web-app with tag "v2".
```

### Check if an image exists in the registry

```
Check if the image with tag "v2" exists in the Fly.io registry for my-web-app.
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

## Architecture

This server uses the **Fly.io CLI (`fly`)** for all operations instead of the REST API directly. This approach:

- Ensures consistent behavior across all tools
- Enables CLI-only features like logs and command execution
- Simplifies authentication (uses `FLY_API_TOKEN` environment variable)

### Rate Limits

The Fly.io API enforces rate limiting (applied by the CLI):

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
│   │   ├── fly-io-client/  # Fly.io CLI client
│   │   │   ├── fly-cli-client.ts   # CLI wrapper
│   │   │   └── fly-io-client.ts    # Interface & exports
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
