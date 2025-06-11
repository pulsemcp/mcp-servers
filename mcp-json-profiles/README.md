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

## Secret Management

Templates can include placeholders for sensitive values using the format `{{SECRET_NAME}}`. These placeholders need to be replaced with actual values before use.

### .secrets File Format

Create a `.secrets` file in the `mcp-json-profiles` directory by copying from the template:

```bash
cp mcp-json-profiles/.secrets.template mcp-json-profiles/.secrets
# Then edit .secrets to add your actual values
```

Example `.secrets` file:

```bash
# Secrets for MCP configurations
# Format: KEY=value

# Exa API
EXA_API_KEY=some-key

# Add other API credentials as needed
# MY_API_KEY=actual-api-key-here
# DATABASE_PASSWORD=secure-password
```

### Using Placeholders in Templates

In your MCP template files, use `{{KEY}}` to reference secrets:

```json
{
  "mcpServers": {
    "exa-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/exa-mcp"],
      "env": {
        "EXA_API_KEY": "{{EXA_API_KEY}}"
      }
    },
    "my-server": {
      "env": {
        "API_KEY": "{{MY_API_KEY}}",
        "DB_PASSWORD": "{{DATABASE_PASSWORD}}"
      }
    }
  }
}
```

### Important Notes

- The `.secrets` file should be gitignored and never committed
- Always verify placeholders are replaced before using configurations
- Keep a backup of your secrets in a secure location

## Extending the Base Configuration

To add additional MCP servers to your setup:

1. Copy the base configuration to your project
2. Add new server entries to the `mcpServers` object
3. Configure environment variables as needed
4. Replace any `{{SECRET_NAME}}` placeholders with actual values

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
        "API_KEY": "{{YOUR_API_KEY}}"
      }
    }
  }
}
```