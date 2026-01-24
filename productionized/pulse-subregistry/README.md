# Pulse Sub-Registry MCP Server

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server that provides access to the PulseMCP Sub-Registry, allowing you to browse and discover MCP servers.

This project is built and maintained by [PulseMCP](https://www.pulsemcp.com/).

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Usage Tips](#usage-tips)
- [Examples](#examples)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Claude Desktop](#claude-desktop)
- [Development](#development)

# Highlights

**Browse MCP servers**: Search and discover MCP servers from the PulseMCP Sub-Registry.

**Get server details**: Retrieve detailed information about specific servers including versions, descriptions, and repository links.

**Pagination support**: Handle large result sets with cursor-based pagination.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name      | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| `list_servers` | Browse MCP servers from the Sub-Registry with optional search and pagination. |
| `get_server`   | Get detailed information about a specific MCP server by name and version.     |

# Usage Tips

- Use `list_servers` to browse available MCP servers. You can search by name or description.
- Use pagination with the `cursor` parameter when there are many results.
- Use `get_server` to get detailed information about a specific server.
- The `version` parameter in `get_server` defaults to "latest" but you can specify a specific version.

# Examples

## Browsing Servers

```
User: "What MCP servers are available for GitHub?"
Assistant: I'll search for GitHub-related MCP servers.

[Uses list_servers tool with search: "github"]

I found several GitHub-related MCP servers:
- @anthropic/mcp-server-github - Official GitHub integration
- github-issues-server - Manage GitHub issues
...
```

## Getting Server Details

```
User: "Tell me more about the filesystem MCP server"
Assistant: I'll get the details for that server.

[Uses get_server tool with server_name: "@anthropic/mcp-server-filesystem"]

The filesystem MCP server (version 1.0.0) provides:
- Description: Access and manage local filesystem
- Repository: https://github.com/anthropics/mcp-servers
...
```

## Pagination

```
User: "Show me more servers"
Assistant: I'll get the next page of results.

[Uses list_servers tool with cursor from previous response]

Here are more servers...
```

# Setup

## Prerequisites

- Node.js (recommended: v18 or higher)
- A PulseMCP API key (get one at https://www.pulsemcp.com/)
- Claude Desktop application (for local setup)

## Environment Variables

| Environment Variable             | Description                                   | Required | Default |
| -------------------------------- | --------------------------------------------- | -------- | ------- |
| `PULSEMCP_SUBREGISTRY_API_KEY`   | Your PulseMCP API key                         | Yes      | N/A     |
| `PULSEMCP_SUBREGISTRY_TENANT_ID` | Your tenant identifier (for multi-tenant use) | No       | N/A     |

## Claude Desktop

### Local Setup

You'll need Node.js installed on your machine to run the local version.

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "pulse-subregistry": {
      "command": "npx",
      "args": ["-y", "@pulsemcp/pulse-subregistry"],
      "env": {
        "PULSEMCP_SUBREGISTRY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

To set up the local version:

1. Clone or download the repository
2. Navigate to the local directory: `cd pulse-subregistry/local`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`
5. Update your Claude Desktop config with the correct path
6. Restart Claude Desktop

# Development

## Project Structure

```
pulse-subregistry/
├── local/                 # Local server implementation
│   ├── src/
│   │   └── index.ts      # Main entry point
│   ├── build/            # Compiled output
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory
│   │   ├── tools.ts      # Tool registration
│   │   ├── tools/        # Individual tools
│   │   ├── client.ts     # API client
│   │   └── types.ts      # Type definitions
│   └── package.json
└── tests/                # Test suite
    ├── functional/       # Unit tests
    └── integration/      # Integration tests
```

## Running in Development Mode

```bash
# Build shared module first
cd shared
npm install
npm run build

# Run local server in development
cd ../local
npm install
npm run dev
```

## Testing

```bash
# Install all dependencies
npm run install-all

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## Linting and Formatting

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all code
npm run format
```

## Tools Reference

### list_servers

Browse MCP servers from the PulseMCP Sub-Registry.

**Parameters:**

- `limit` (number, optional): Maximum number of servers to return (1-100). Default: 30.
- `cursor` (string, optional): Pagination cursor from a previous response.
- `search` (string, optional): Search term to filter servers by name or description.
- `updated_since` (string, optional): ISO 8601 timestamp to filter servers updated after this date. Example: "2024-01-01T00:00:00Z".

### get_server

Get detailed information about a specific MCP server.

**Parameters:**

- `server_name` (string, required): The name of the server to look up.
- `version` (string, optional): Specific version to retrieve. Default: "latest".

## License

MIT
