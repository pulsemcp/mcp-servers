# Claude Code Agent MCP Server

An MCP server that solves the "tool overload" problem by enabling agentic MCP configuration. Instead of having all your MCP servers active at once (bloating your context window), this server lets you dynamically spin up a Claude Code subagent with only the relevant MCP servers for the task at hand.

# Table of Contents

- [Overview](#overview)
- [Capabilities](#capabilities)
- [Usage Tips](#usage-tips)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Claude Desktop](#claude-desktop)
- [Development](#development)
- [Configuration Requirements](#configuration-requirements)
- [Tools](#tools)
- [Resources](#resources)
- [Example Workflow](#example-workflow)

# Overview

The Claude Code Agent MCP Server implements the agentic MCP configuration pattern, allowing you to:

- Start a Claude Code subagent with a custom system prompt
- Analyze your trusted servers list to find only the relevant servers for a task
- Install just those servers on the subagent
- Hand off the task to the properly-equipped subagent
- Inspect transcripts when debugging is needed

This approach scales to hundreds of trusted servers without any tool overload, as each subagent only has the handful of servers it actually needs.

> **Note**: This server demonstrates the agentic MCP configuration pattern. In the future, we expect MCP clients like Claude Code to have this functionality built-in natively.

# Capabilities

| Tool                      | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `init_agent`              | Initialize a Claude Code subagent with custom system prompt |
| `find_servers`            | Discover relevant MCP servers based on task description     |
| `install_servers`         | Install selected MCP servers in the subagent                |
| `chat`                    | Send prompts to subagent and receive responses              |
| `inspect_transcript`      | View conversation history for debugging                     |
| `stop_agent`              | Gracefully shut down the subagent                           |
| `get_server_capabilities` | Query capabilities of available MCP servers                 |

| Resource            | Description                                          |
| ------------------- | ---------------------------------------------------- |
| Subagent State      | Current status, configuration, and installed servers |
| Subagent Transcript | Full conversation history in JSON format             |

# Usage Tips

- **One agent per server**: Each Claude Code Agent MCP Server instance manages a single subagent
- **Automatic server discovery**: The `find_servers` tool analyzes your task and suggests only relevant servers
- **Stateful management**: The server maintains agent state across tool calls within the same session
- **Resource inspection**: Use MCP resources to inspect agent state and transcripts for debugging
- **Clean shutdown**: Always use `stop_agent` when done to free resources

## Setup

### Prerequisites

- Node.js 18+
- Claude CLI installed (for production use)
- Your own `servers.md` and `servers.json` files with your trusted MCP servers

### Environment Variables

| Variable                 | Description                    | Required | Default              |
| ------------------------ | ------------------------------ | -------- | -------------------- |
| `TRUSTED_SERVERS_PATH`   | Path to your servers.md file   | Yes      | `./servers.md`       |
| `SERVER_CONFIGS_PATH`    | Path to your servers.json file | Yes      | `./servers.json`     |
| `CLAUDE_CODE_PATH`       | Path to Claude CLI executable  | No       | `claude`             |
| `SERVER_SECRETS_PATH`    | Path to .secrets file          | No       | -                    |
| `CLAUDE_AGENT_BASE_DIR`  | Agent workspace directory      | No       | `/tmp/claude-agents` |
| `CLAUDE_AGENT_LOG_LEVEL` | Logging level                  | No       | `info`               |

### Claude Desktop

#### Using NPM (when published)

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "claude-code-agent": {
      "command": "npx",
      "args": ["claude-code-agent-mcp-server"],
      "env": {
        "TRUSTED_SERVERS_PATH": "/path/to/your/servers.md",
        "SERVER_CONFIGS_PATH": "/path/to/your/servers.json"
      }
    }
  }
}
```

#### Using Local Build

For development or before the package is published:

```json
{
  "mcpServers": {
    "claude-code-agent": {
      "command": "node",
      "args": ["/path/to/claude-code-agent/local/build/index.js"],
      "env": {
        "TRUSTED_SERVERS_PATH": "/path/to/your/servers.md",
        "SERVER_CONFIGS_PATH": "/path/to/your/servers.json"
      }
    }
  }
}
```

## Development

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

### Quick Start

```bash
# Clone and navigate to the project
git clone https://github.com/pulsemcp/mcp-servers
cd mcp-servers/experimental/claude-code-agent

# Install dependencies
npm run install-all

# Build
npm run build

# Run tests
npm test
```

## Configuration Requirements

This server requires two configuration files that you must create:

### 1. servers.md

Your trusted servers list with descriptions. Example format:

```markdown
## com.microsoft/playwright

Used for UI automation and testing. Only install when working with web interfaces.

## com.pulsemcp/appsignal

Monitoring and error tracking. Install when debugging production issues.

## io.github.crystaldba/postgres

PostgreSQL integration. Install for database operations.
```

### 2. servers.json

Your server installation configurations following the MCP server.json format:

```json
[
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
    "name": "com.microsoft/playwright",
    "description": "Browser automation",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "@playwright/mcp",
        "version": "latest"
      }
    ]
  }
]
```

## Tools

### `init_agent`

Initializes a Claude Code subagent with a custom system prompt.

**Input:**

```typescript
{
  system_prompt: string; // Custom system prompt for the subagent
}
```

**Returns:**

- Resource URI pointing to the agent state file
- Session UUID for the Claude Code instance
- Initial status (idle/working)

### `find_servers`

Analyzes your trusted servers list to determine which MCP servers are relevant for the given task.

**Input:**

```typescript
{
  task_prompt: string; // Description of the task to accomplish
}
```

**Returns:**

- Array of recommended server names from your trusted list
- Rationale for each recommendation

### `install_servers`

Installs and configures MCP servers on the subagent using your servers.json configurations.

**Input:**

```typescript
{
  server_names: string[];   // Names of servers to install (from find_servers output)
  server_configs?: object;  // Optional: custom configurations for servers
}
```

**Returns:**

- Installation status for each server
- Updated subagent configuration

### `chat`

Sends a message to the subagent and waits for the response.

**Input:**

```typescript
{
  prompt: string;      // Message/task to send to the subagent
  timeout?: number;    // Optional: timeout in milliseconds (default: 300000 - 5 minutes)
}
```

**Returns:**

- Subagent's response message
- Conversation metadata (tokens used, duration, etc.)

**Timeout Values:**

- Default: 300000ms (5 minutes) for chat operations
- Agent initialization: 30000ms (30 seconds)
- General commands: 60000ms (1 minute)

### `inspect_transcript`

Retrieves the subagent's conversation transcript for debugging when things go astray.

**Input:**

```typescript
{
  format?: 'markdown' | 'json';  // Optional: transcript format (default: markdown)
}
```

**Returns:**

- File URI to the transcript
- Transcript metadata

### `stop_agent`

Gracefully stops the running subagent.

**Input:**

```typescript
{
  force?: boolean;     // Optional: force kill if graceful shutdown fails (default: false)
}
```

**Returns:**

- Shutdown status
- Final subagent state

### `get_server_capabilities`

Retrieves capabilities and descriptions for specified MCP servers.

**Input:**

```typescript
{
  server_names: string[];  // Names of servers to query
}
```

**Returns:**

- Server capabilities (tools, resources, prompts)
- Server descriptions and metadata

## Resources

### Subagent State

The subagent's state is stored as a formatted JSON file accessible via:

```
file:///path/to/agent/state.json
```

Contains: session UUID, status (idle/working), installed servers, system prompt

### Subagent Transcript

The subagent's conversation transcript is stored as a formatted JSON file at:

```
file:///path/to/agent/transcript.json
```

Contains: full conversation history with the subagent for debugging purposes

## Architecture

The Claude Code Agent MCP Server uses a layered architecture:

1. **MCP Interface Layer**: Handles MCP protocol communication with the main agent
2. **Subagent Management Layer**: Manages Claude Code subagent lifecycle and state
3. **Claude Code Integration Layer**: Interfaces with Claude CLI via stdio
4. **Server Discovery Layer**: Analyzes trusted servers list for task relevance
5. **Configuration Management**: Dynamically updates subagent's .mcp.json

## Example Workflow

### Real-world Example: Bug Triage from Twist

Here's how the agentic MCP configuration pattern works in practice:

1. **Start Claude Code** in your home directory with just the claude-code-agent server enabled

2. **User prompt**: "Please triage this bug from Twist: [link to Twist message]"

3. **Main agent workflow**:

   ```
   Uses init_agent:
     → System prompt: "You are helping triage a production bug"
     → Returns: Subagent initialized

   Uses find_servers:
     → Task: "Triage bug from Twist messaging platform"
     → Returns: ["com.pulsemcp/appsignal", "com.twist/mcp", "com.postgres/mcp", "com.pulsemcp/fetch"]

   Uses install_servers:
     → Servers: ["com.pulsemcp/appsignal", "com.twist/mcp", "com.postgres/mcp", "com.pulsemcp/fetch"]
     → Returns: Servers configured on subagent

   Uses chat:
     → Prompt: "Please triage this bug from Twist: [link]"
     → Subagent investigates using Twist API, checks AppSignal logs, queries database
     → Returns: Root cause analysis and proposed fix
   ```

4. **Result**: The subagent opens a PR with the fix, having only the exact tools it needed

5. **Follow-up**: You can continue driving the subagent through the main agent for any additional requests

This scales to hundreds of trusted servers - each task gets exactly the tools it needs, no more, no less.

## Development

### Setup

```bash
# Install dependencies
npm install

# Setup development environment
cd local && node setup-dev.js

# Run in development mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run functional tests only
npm run test:functional

# Run integration tests
npm run test:integration

# Run manual tests (requires Claude CLI)
npm run test:manual
```

### Building

```bash
# Build both shared and local modules
npm run build

# Watch mode for development
npm run dev
```

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for general contribution guidelines.

## License

MIT
