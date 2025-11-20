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

- ✅ Basic project structure set up following libs/mcp-server-template
- ✅ Tool schemas defined for all three AppSignal operations
- ⚠️ Tool implementations are currently stubbed (TODO: integrate with AppSignal REST API)
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

## Testing

This project has three types of tests:

1. **Functional Tests** (`npm test`) - Unit tests that mock all external dependencies
2. **Integration Tests** (`npm run test:integration`) - Tests the MCP server with mocked AppSignal API
3. **Manual Tests** (`npm run test:manual`) - Tests against the real AppSignal API

### Manual Testing

Manual tests are critical when modifying the AppsignalClient or any code that interacts with external APIs. They:

- Use real AppSignal API credentials (not mocked)
- Verify the actual API integration works correctly
- Test response shapes and error handling with real data
- Are NOT run in CI to avoid external dependencies

**When to run manual tests:**

- After modifying any code in `shared/src/appsignal-client/`
- When updating GraphQL queries or API interactions
- Before releasing changes that affect external API calls
- When debugging issues that only appear with real API responses
- After creating a new worktree or fresh checkout

**First-time setup (REQUIRED for new worktrees):**

```bash
# This ensures everything is properly installed and built
npm run test:manual:setup
```

This setup script will:

- Verify .env file exists with a real API key
- Install all dependencies (root + workspaces + test-mcp-client)
- Build everything needed for manual tests
- Prevent common errors like missing vitest or test-mcp-client

**Running manual tests:**

```bash
# After setup is complete, run all manual tests
npm run test:manual

# Or run a specific test file
npm run test:manual -- tests/manual/search-logs-400.manual.test.ts
```

Manual tests follow a complete end-to-end workflow:

1. Get list of apps
2. Select first available app
3. Search for logs with various patterns
4. Test error handling
5. Provide detailed console output of actual API responses

**Test Outcomes:**

- **SUCCESS**: Core functionality works (may have warnings)
- **WARNING**: Some features couldn't be validated due to data/API limitations
- **FAILURE**: Verifiable breakage requiring fixes

**Known Limitations:**

- AppSignal GraphQL API doesn't support top-level `app(id:)` queries - must query through `viewer.organizations.apps`
- The `attributes` field in log lines causes 500 errors and has been removed from queries

## Development Workflow

- **Changelog Updates**: Always update the CHANGELOG.md file when making changes to this MCP server to track improvements and maintain version history

## Logging

This server uses a centralized logging module (`shared/src/logging.ts`) for all output. **IMPORTANT**: Never use `console.log` directly in server code as it interferes with the MCP protocol (stdout must only contain JSON messages).

Instead, use the logging functions:

- `logServerStart(serverName)` - Log server startup
- `logError(context, error)` - Log errors with context
- `logWarning(context, message)` - Log warnings
- `logDebug(context, message)` - Log debug info (only when NODE_ENV=development or DEBUG=true)

All logging functions output to stderr to maintain MCP protocol compliance.
