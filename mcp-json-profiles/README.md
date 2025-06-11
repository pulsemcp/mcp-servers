# MCP Base Configuration

This directory contains the base MCP (Model Context Protocol) configuration for development environments.

## Base Profile (`.mcp.base.json`)

The base configuration provides essential MCP servers for general development of MCP servers in this repository.

## Usage

### Quick Start

Copy the base configuration to your working directory:

```bash
cp mcp-json-profiles/.mcp.base.json .mcp.json
```

## Extending the Base Configuration

To add additional MCP servers to your setup:

1. Copy the base configuration to your project
2. Add new server entries to the `mcpServers` object
3. Configure environment variables as needed

Example extension:
```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {}
    },
    "your-server": {
      "type": "stdio",
      "command": "your-command",
      "args": ["your-args"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```