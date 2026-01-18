# Agent Orchestrator MCP Server

MCP server for PulseMCP's agent-orchestrator: a Claude Code + MCP-powered agent-parallelization system for agentic coding and ops done at PulseMCP.

## Highlights

- Simplified 5-tool interface for full agent session management
- Search, filter, and retrieve sessions with optional logs and transcripts
- Session lifecycle actions (pause, restart, archive, unarchive, follow_up, change_mcp_servers)
- Static configuration access via tools and MCP resources
- Tool grouping system for permission-based access control
- TypeScript with strict type checking
- Comprehensive testing setup (functional, integration, manual)

## Capabilities

### Tools

| Tool              | Group    | Description                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------------- |
| `search_sessions` | readonly | Search/list sessions with optional ID lookup, query, and status filter             |
| `get_session`     | readonly | Get detailed session info with optional logs and transcripts                       |
| `get_configs`     | readonly | Fetch all static configuration (MCP servers, agent roots, stop conditions)         |
| `start_session`   | write    | Create and start a new agent session                                               |
| `action_session`  | write    | Perform actions: follow_up, pause, restart, archive, unarchive, change_mcp_servers |

### Resources

| Resource                                       | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| `agent-orchestrator://config`                  | Server configuration and status (for debugging) |
| `agent-orchestrator://configs/mcp-servers`     | List of available MCP servers for sessions      |
| `agent-orchestrator://configs/agent-roots`     | Preconfigured repository settings with defaults |
| `agent-orchestrator://configs/stop-conditions` | Session completion criteria definitions         |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `readonly` | Read-only operations (list, get, search)                                    |
| `write`    | Write operations (create, update, follow_up, pause, restart, archive, etc.) |
| `admin`    | Administrative operations (delete)                                          |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `ENABLED_TOOLGROUPS="readonly,write"` - Read and write, no admin
- Not set - All tools enabled (default)

## Setup

### Prerequisites

- Node.js (use `nvm use` if you have nvm installed)
- An Agent Orchestrator instance with API access

### Environment Variables

| Variable                      | Required | Description                            | Default     |
| ----------------------------- | -------- | -------------------------------------- | ----------- |
| `AGENT_ORCHESTRATOR_BASE_URL` | Yes      | Base URL for the orchestrator API      | -           |
| `AGENT_ORCHESTRATOR_API_KEY`  | Yes      | API key for authentication             | -           |
| `ENABLED_TOOLGROUPS`          | No       | Comma-separated tool groups            | All enabled |
| `SKIP_HEALTH_CHECKS`          | No       | Skip API connectivity check at startup | `false`     |
| `HEALTH_CHECK_TIMEOUT`        | No       | Health check timeout in milliseconds   | `10000`     |

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
        "ENABLED_TOOLGROUPS": "readonly,write"
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

### Logs

- `GET /api/v1/sessions/:session_id/logs` - List logs
- `POST /api/v1/sessions/:session_id/logs` - Create log

### Subagent Transcripts

- `GET /api/v1/sessions/:session_id/subagent_transcripts` - List transcripts
- `GET /api/v1/sessions/:session_id/subagent_transcripts/:id` - Get transcript

## License

MIT
