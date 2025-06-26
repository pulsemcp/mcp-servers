# Important: AppSignal App ID Notes

## Production vs Development App IDs

When working with the AppSignal MCP server, it's crucial to use the correct app ID for your environment:

- **Production App ID**: `674fa72ad2a5e4ed3afb6b2c` (pulsemcp/production)
- **Development App ID**: `674fa20cd2a5e4ed3afb6b25` (pulsemcp/development)

## Common Issue

If you're getting empty results from incident queries when you expect data, verify you're using the correct app ID:

1. The development environment typically has no incidents
2. The production environment contains real incident data

## How to Verify

Use the `get_apps` tool to list all available apps and their environments:

```bash
# This will show all apps with their IDs and environments
get_apps
```

Then use `select_app_id` with the appropriate ID for your needs.