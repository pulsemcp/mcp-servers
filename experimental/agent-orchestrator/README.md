# Agent Orchestrator MCP Server

MCP server for PulseMCP's agent-orchestrator: a Claude Code + MCP-powered agent-parallelization system for agentic coding and ops done at PulseMCP.

## Highlights

- Full CRUD operations for agent sessions, logs, and subagent transcripts
- Session lifecycle management (create, pause, restart, archive, unarchive)
- Follow-up prompts for interactive agent conversations
- Tool grouping system for permission-based access control
- TypeScript with strict type checking
- Comprehensive testing setup (functional, integration, manual)

## Capabilities

### Tools

| Tool                        | Group    | Description                                    |
| --------------------------- | -------- | ---------------------------------------------- |
| `list_sessions`             | readonly | List agent sessions with optional filtering    |
| `get_session`               | readonly | Get detailed session info including transcript |
| `search_sessions`           | readonly | Search sessions by query string                |
| `create_session`            | write    | Create a new agent session                     |
| `update_session`            | write    | Update session title, slug, or metadata        |
| `follow_up`                 | write    | Send follow-up prompt to a paused session      |
| `pause_session`             | write    | Pause a running session                        |
| `restart_session`           | write    | Restart a paused or failed session             |
| `archive_session`           | write    | Archive a session                              |
| `unarchive_session`         | write    | Restore an archived session                    |
| `delete_session`            | admin    | Permanently delete a session                   |
| `list_logs`                 | readonly | List logs for a session                        |
| `create_log`                | write    | Create a log entry for a session               |
| `list_subagent_transcripts` | readonly | List subagent transcripts for a session        |
| `get_subagent_transcript`   | readonly | Get detailed subagent transcript info          |

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
