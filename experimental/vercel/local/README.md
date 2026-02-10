# Vercel MCP Server (Local)

Local stdio transport implementation of the Vercel MCP server.

## Configuration

Set the following environment variables before running:

```bash
export VERCEL_TOKEN="your-vercel-api-token"

# Optional: for team-scoped operations
export VERCEL_TEAM_ID="team_abc123"
export VERCEL_TEAM_SLUG="my-team"

# Optional: limit enabled tool groups
export VERCEL_ENABLED_TOOLGROUPS="readonly"
```
