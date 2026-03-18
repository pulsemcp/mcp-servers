# Zoom MCP Server

An MCP server for interacting with Zoom meetings and recordings.

## Tools

| Tool              | Description                                   |
| ----------------- | --------------------------------------------- |
| `list_meetings`   | List Zoom meetings for the authenticated user |
| `get_meeting`     | Get details for a specific Zoom meeting by ID |
| `list_recordings` | List cloud recordings within a date range     |

## Configuration

### Environment Variables

| Variable             | Required | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `ZOOM_ACCESS_TOKEN`  | Yes      | Zoom OAuth access token                              |
| `ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups to enable (default: all) |

### Setup

1. Create a Zoom OAuth app at https://marketplace.zoom.us/
2. Generate an access token with `meeting:read` and `recording:read` scopes
3. Set the `ZOOM_ACCESS_TOKEN` environment variable

### Usage with Claude Desktop

Add this to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "zoom": {
      "command": "npx",
      "args": ["zoom-mcp-server"],
      "env": {
        "ZOOM_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

## Development

```bash
npm run install-all   # Install all dependencies
npm run build         # Build the project
npm run dev           # Run in development mode
npm test              # Run functional tests
npm run test:integration  # Run integration tests
```

## Not Yet Published

This server is in experimental development and has not been published to npm yet.
