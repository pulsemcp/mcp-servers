# CLAUDE.md - AppSignal MCP Server

This MCP server provides integration with AppSignal's application performance monitoring and error tracking API.

## Project Structure

```
experimental/appsignal/
├── local/          # Stdio transport implementation
├── shared/         # Core business logic and API integration
└── remote/         # HTTP transport (not yet implemented)
```

## Implementation Status

- ✅ Basic project structure set up following mcp-server-template
- ✅ Tool schemas defined for all three AppSignal operations
- ⚠️  Tool implementations are currently stubbed (TODO: integrate with AppSignal REST API)
- ❌ Remote/HTTP implementation not started

## Next Steps

1. Implement actual AppSignal API calls in `shared/src/tools.ts`:
   - Use fetch or axios to make HTTP requests to AppSignal API
   - Handle authentication using the API key
   - Parse and format responses appropriately

2. Add error handling and retry logic for API calls

3. Consider adding more tools based on AppSignal API capabilities

## Environment Variables

- `APPSIGNAL_API_KEY`: Required for API authentication
- `APPSIGNAL_APP_ID`: Optional, used to identify the application if provided

## Development Commands

```bash
# From the appsignal directory
npm install-all     # Install dependencies in all workspaces
npm run build       # Build shared and local modules
npm run dev         # Run in development mode
```