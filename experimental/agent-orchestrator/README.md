# Agent Orchestrator MCP Server

MCP server for PulseMCP's agent-orchestrator: a Claude Code + MCP-powered agent-parallelization system for agentic coding and ops done at PulseMCP.

## Highlights

- Simplified 4-tool interface for full agent session management
- Search, filter, and retrieve sessions with optional logs and transcripts
- Session lifecycle actions (pause, restart, archive, unarchive, follow_up)
- Tool grouping system for permission-based access control
- TypeScript with strict type checking
- Comprehensive testing setup (functional, integration, manual)

## Capabilities

### Tools

| Tool              | Group    | Description                                                            |
| ----------------- | -------- | ---------------------------------------------------------------------- |
| `search_sessions` | readonly | Search/list sessions with optional ID lookup, query, and status filter |
| `get_session`     | readonly | Get detailed session info with optional logs and transcripts           |
| `start_session`   | write    | Create and start a new agent session                                   |
| `action_session`  | write    | Perform actions: follow_up, pause, restart, archive, unarchive         |

### Resources

| Resource                      | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `agent-orchestrator://config` | Server configuration and status (for debugging) |

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

## Quick Start

### Installation

```bash
npm run install-all
npm run build
```

### Configuration

Set the required environment variables:

```bash
export AGENT_ORCHESTRATOR_BASE_URL="http://localhost:3000"
export AGENT_ORCHESTRATOR_API_KEY="your_api_key_here"
```

### Running

```bash
npm start
```

## Environment Variables

| Variable                      | Required | Description                       | Default     |
| ----------------------------- | -------- | --------------------------------- | ----------- |
| `AGENT_ORCHESTRATOR_BASE_URL` | Yes      | Base URL for the orchestrator API | -           |
| `AGENT_ORCHESTRATOR_API_KEY`  | Yes      | API key for authentication        | -           |
| `ENABLED_TOOLGROUPS`          | No       | Comma-separated tool groups       | All enabled |
| `SKIP_HEALTH_CHECKS`          | No       | Skip API validation at startup    | `false`     |

### Claude Desktop Configuration

#### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "node",
      "args": ["/path/to/agent-orchestrator/local/build/index.js"],
      "env": {
        "AGENT_ORCHESTRATOR_BASE_URL": "http://localhost:3000",
        "AGENT_ORCHESTRATOR_API_KEY": "your-api-key-here",
        "ENABLED_TOOLGROUPS": "readonly,write"
      }
    }
  }
}
```

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
