# Agent Orchestrator MCP Server

MCP server for PulseMCP's agent-orchestrator: a Claude Code + MCP-powered agent-parallelization system for agentic coding and ops done at PulseMCP.

## Highlights

- Simplified 6-tool interface for full agent session management
- Search, filter, and retrieve sessions with optional logs and transcripts
- Session lifecycle actions (pause, restart, archive, unarchive, follow_up, change_mcp_servers)
- Static configuration access via tools and MCP resources
- Tool grouping system for permission-based access control
- TypeScript with strict type checking
- Comprehensive testing setup (functional, integration, manual)

## Capabilities

### Tools

| Tool                     | Tool Group    | Read/Write | Description                                                                        |
| ------------------------ | ------------- | ---------- | ---------------------------------------------------------------------------------- |
| `search_sessions`        | sessions      | read       | Search/list sessions with optional ID lookup, query, and status filter             |
| `get_session`            | sessions      | read       | Get detailed session info with optional logs and transcripts                       |
| `get_configs`            | sessions      | read       | Fetch all static configuration (MCP servers, agent roots, stop conditions)         |
| `start_session`          | sessions      | write      | Create and start a new agent session                                               |
| `action_session`         | sessions      | write      | Perform actions: follow_up, pause, restart, archive, unarchive, change_mcp_servers |
| `send_push_notification` | notifications | write      | Send a push notification about a session needing human attention                   |

### Resources

| Resource                                       | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| `agent-orchestrator://config`                  | Server configuration and status (for debugging) |
| `agent-orchestrator://configs/mcp-servers`     | List of available MCP servers for sessions      |
| `agent-orchestrator://configs/agent-roots`     | Preconfigured repository settings with defaults |
| `agent-orchestrator://configs/stop-conditions` | Session completion criteria definitions         |

### Tool Groups

This server organizes tools into groups that can be selectively enabled or disabled. Each group has two variants:

- **Base group** (e.g., `sessions`): Full read + write access
- **Readonly group** (e.g., `sessions_readonly`): Read-only access

Control which tools are available via the `TOOL_GROUPS` environment variable:

| Group                    | Description                                                           |
| ------------------------ | --------------------------------------------------------------------- |
| `sessions`               | All session tools (read + write): search, get, configs, start, action |
| `sessions_readonly`      | Session tools (read only): search_sessions, get_session, get_configs  |
| `notifications`          | All notification tools (read + write): send_push_notification         |
| `notifications_readonly` | Notification tools (read only)                                        |

**Examples:**

Enable all tools with full access (default):

```bash
# No TOOL_GROUPS needed - all base groups enabled
```

Enable only session tools:

```bash
TOOL_GROUPS=sessions
```

Enable sessions with read-only access:

```bash
TOOL_GROUPS=sessions_readonly
```

Enable all groups with read-only access:

```bash
TOOL_GROUPS=sessions_readonly,notifications_readonly
```

Mix full and read-only access per group:

```bash
# Full session access, read-only notifications
TOOL_GROUPS=sessions,notifications_readonly
```

## Setup

### Prerequisites

- Node.js (use `nvm use` if you have nvm installed)
- An Agent Orchestrator instance with API access

### Environment Variables

| Variable                      | Required | Description                                 | Default                               |
| ----------------------------- | -------- | ------------------------------------------- | ------------------------------------- |
| `AGENT_ORCHESTRATOR_BASE_URL` | Yes      | Base URL for the orchestrator API           | -                                     |
| `AGENT_ORCHESTRATOR_API_KEY`  | Yes      | API key for authentication                  | -                                     |
| `TOOL_GROUPS`                 | No       | Comma-separated list of enabled tool groups | `sessions,notifications` (all groups) |
| `SKIP_HEALTH_CHECKS`          | No       | Skip API connectivity check at startup      | `false`                               |
| `HEALTH_CHECK_TIMEOUT`        | No       | Health check timeout in milliseconds        | `10000`                               |

### Claude Desktop

Make sure you have your Agent Orchestrator base URL and API key ready.

Then proceed to the setup instructions below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

#### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "npx",
      "args": ["-y", "agent-orchestrator-mcp-server"],
      "env": {
        "AGENT_ORCHESTRATOR_BASE_URL": "http://localhost:3000",
        "AGENT_ORCHESTRATOR_API_KEY": "your-api-key-here",
        "TOOL_GROUPS": "sessions,notifications"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Development

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

# Run integration tests (full MCP protocol)
npm run test:integration

# Run all automated tests
npm run test:all
```

### Linting and Formatting

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## API Coverage

This MCP server provides tools for the following Agent Orchestrator REST API endpoints:

### Sessions

- `GET /api/v1/sessions` - List sessions
- `GET /api/v1/sessions/search` - Search sessions
- `GET /api/v1/sessions/:id` - Get session
- `POST /api/v1/sessions` - Create session
- `PATCH /api/v1/sessions/:id` - Update session
- `DELETE /api/v1/sessions/:id` - Delete session
- `POST /api/v1/sessions/:id/archive` - Archive session
- `POST /api/v1/sessions/:id/unarchive` - Unarchive session
- `POST /api/v1/sessions/:id/follow_up` - Send follow-up prompt
- `POST /api/v1/sessions/:id/pause` - Pause session
- `POST /api/v1/sessions/:id/restart` - Restart session

### Notifications

- `POST /api/v1/notifications/push` - Send push notification

### Logs

- `GET /api/v1/sessions/:session_id/logs` - List logs
- `POST /api/v1/sessions/:session_id/logs` - Create log

### Subagent Transcripts

- `GET /api/v1/sessions/:session_id/subagent_transcripts` - List transcripts
- `GET /api/v1/sessions/:session_id/subagent_transcripts/:id` - Get transcript

## License

MIT
