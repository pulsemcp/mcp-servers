# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Claude Code Agent MCP Server.

See the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.

## Overview

The Claude Code Agent MCP Server implements the "agentic MCP configuration" pattern to solve the tool overload problem. Instead of having all MCP servers active at once (which bloats the context window), this server enables you to dynamically spin up Claude Code subagents with only the relevant MCP servers for specific tasks.

This server acts as a meta-orchestrator that:

- Analyzes your trusted servers list to find task-relevant servers
- Initializes Claude Code subagents with custom system prompts
- Dynamically installs only the needed MCP servers on each subagent
- Manages subagent lifecycle and conversation state
- Provides debugging capabilities through transcript inspection

## Key Architecture Components

### Server Factory Pattern

The server uses dependency injection with a factory pattern in `shared/src/server.ts`:

- Enables testing with mock Claude Code clients
- Separates subagent management from MCP protocol handling
- Supports both production and test configurations

### Claude Code Client Integration

The core functionality is implemented through the `IClaudeCodeClient` interface:

- **Production**: Uses real Claude CLI via stdio communication
- **Testing**: Uses mocks for predictable test behavior
- **Location**: `shared/src/claude-code-client/`

### State Management

The server maintains subagent state through:

- **Agent State**: JSON files tracking session UUID, status, installed servers
- **Transcripts**: Full conversation history for debugging
- **Resource URIs**: Accessible via MCP resources for inspection

## Tool Implementation Details

### Core Tools

- **`init_agent`**: Creates new Claude Code subagent with custom system prompt
- **`find_servers`**: Analyzes trusted servers list for task relevance
- **`install_servers`**: Configures MCP servers on the subagent
- **`chat`**: Sends prompts to subagent and returns responses
- **`inspect_transcript`**: Retrieves conversation history for debugging
- **`stop_agent`**: Gracefully shuts down the subagent
- **`get_server_capabilities`**: Queries available server capabilities

### Tool Design Principles

Each tool follows the factory pattern:

```typescript
export function toolName(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'tool_name',
    description: '...',
    inputSchema: {
      /* JSON Schema */
    },
    handler: async (args: unknown) => {
      /* implementation */
    },
  };
}
```

Tools use:

- Zod schemas for input validation (defined in `types.ts`)
- Dependency injection for Claude Code client access
- Structured error handling with logging
- Detailed descriptions following the Tool Descriptions Guide

## Configuration Requirements

This server requires two configuration files that users must provide:

### 1. servers.md (TRUSTED_SERVERS_PATH)

Markdown file listing trusted MCP servers with descriptions for AI analysis:

```markdown
## com.microsoft/playwright

Used for UI automation and testing. Only install when working with web interfaces.

## com.pulsemcp/appsignal

Monitoring and error tracking. Install when debugging production issues.
```

### 2. servers.json (SERVER_CONFIGS_PATH)

JSON file with MCP server installation configurations:

```json
[
  {
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

## Environment Variables

| Variable                    | Description                          | Required | Default              |
| --------------------------- | ------------------------------------ | -------- | -------------------- |
| `TRUSTED_SERVERS_PATH`      | Path to servers.md file              | Yes      | `./servers.md`       |
| `SERVER_CONFIGS_PATH`       | Path to servers.json file            | Yes      | `./servers.json`     |
| `CLAUDE_CODE_PATH`          | Path to Claude CLI executable        | No       | `claude`             |
| `SERVER_SECRETS_PATH`       | Path to .secrets file                | No       | -                    |
| `CLAUDE_AGENT_BASE_DIR`     | Agent workspace directory            | No       | `/tmp/claude-agents` |
| `PROJECT_WORKING_DIRECTORY` | Directory for state.json persistence | No       | `process.cwd()`      |
| `CLAUDE_AGENT_LOG_LEVEL`    | Logging level                        | No       | `info`               |

## Testing Strategy

### Test Types

1. **Functional Tests**: Unit tests with mocked Claude Code client
2. **Integration Tests**: Full MCP protocol tests using TestMCPClient
3. **Manual Tests**: Tests with real Claude CLI for end-to-end validation

### Mock Infrastructure

- **Functional Mock**: `claude-code-client.functional-mock.ts` - Simple return values
- **Integration Mock**: `claude-code-client.integration-mock.ts` - Stateful simulation

### Manual Testing

Manual tests are critical for this server because:

- They verify real Claude CLI integration works correctly
- They test the actual subagent lifecycle management
- They validate MCP server installation on real subagents

Run manual tests with:

```bash
npm run test:manual
```

## Development Workflow

### Adding New Tools

1. Create tool file in `shared/src/tools/`
2. Follow the factory pattern with dependency injection
3. Add Zod schema to `types.ts`
4. Register in `tools.ts`
5. Add comprehensive tests (functional + integration)
6. Update CHANGELOG.md

### Modifying Claude Code Integration

1. Update interface in `claude-code-client.ts`
2. Implement in both production and mock clients
3. Add integration tests for new functionality
4. Run manual tests to verify real CLI integration

### Error Handling

- All tools use structured error handling
- Logging goes to stderr to maintain MCP protocol compliance
- Client errors are wrapped and re-thrown with context
- Timeout handling for long-running subagent operations

## Logging

This server uses centralized logging (`shared/src/logging.ts`):

- **IMPORTANT**: Never use `console.log` directly - it breaks MCP protocol
- Use logging functions that output to stderr
- Debug logging only when `NODE_ENV=development` or `DEBUG=true`

## Claude Learnings

### Agentic MCP Configuration Pattern

- **Problem**: Tool overload when all MCP servers are active at once
- **Solution**: Dynamic subagent creation with task-specific server sets
- **Benefit**: Scales to hundreds of trusted servers without context window bloat
- **Pattern**: Main agent → analyze task → find relevant servers → create equipped subagent → delegate task

### Subagent Management

- Each server instance manages exactly one subagent at a time
- Subagents run in isolated workspaces with their own .mcp.json configs
- State persistence allows inspection and debugging through MCP resources
- Graceful shutdown prevents resource leaks and orphaned processes

### Real-world Usage

Example workflow for "Triage bug from Twist":

1. `init_agent` with bug triage system prompt
2. `find_servers` discovers: appsignal, twist-mcp, postgres-mcp, fetch
3. `install_servers` configures only those 4 servers on subagent
4. `chat` delegates bug investigation to properly-equipped subagent
5. Subagent uses only relevant tools, no context window bloat

### Development Considerations

- Mock clients must maintain state to simulate real subagent behavior
- Integration tests should verify the full MCP protocol flow
- Manual tests are essential due to complex Claude CLI integration
- Timeout handling is critical for long-running subagent operations
