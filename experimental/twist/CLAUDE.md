# CLAUDE.md - Twist MCP Server

This MCP server provides integration with Twist's team messaging and collaboration API.

## Project Structure

```
experimental/twist/
├── local/          # Stdio transport implementation
├── shared/         # Core business logic and API integration
└── remote/         # HTTP transport (not yet implemented)
```

## Implementation Status

- ✅ Basic project structure planned
- ✅ Tool schemas designed for all six Twist operations
- ⚠️ Tool implementations need to be created
- ❌ Remote/HTTP implementation not started

## Environment Variables

- `TWIST_BEARER_TOKEN`: Required for API authentication (format: "Bearer tk\_...")
- `TWIST_WORKSPACE_ID`: Required to identify the workspace

## Development Commands

```bash
# From the twist directory
npm install-all     # Install dependencies in all workspaces
npm run build       # Build shared and local modules
npm run dev         # Run in development mode
npm test            # Run functional tests
npm run test:integration  # Run integration tests
npm run test:manual # Run manual tests (requires real API credentials)
```

## Testing Strategy

This project follows the three-tier testing approach:

1. **Functional Tests** - Unit tests with all external dependencies mocked
2. **Integration Tests** - Tests the MCP server with mocked Twist API
3. **Manual Tests** - Tests against the real Twist API

### Manual Testing

Manual tests are critical when modifying the TwistClient or any code that interacts with external APIs. They:

- Use real Twist API credentials (not mocked)
- Verify the actual API integration works correctly
- Test response shapes and error handling with real data
- Are NOT run in CI to avoid external dependencies

**When to run manual tests:**

- After modifying any code in `shared/src/twist-client/`
- When updating API endpoints or request/response handling
- Before releasing changes that affect external API calls
- When debugging issues that only appear with real API responses

## Implementation Notes

### Authentication

Twist uses Bearer token authentication. The token should be included in the Authorization header:

```
Authorization: Bearer tk_abc123...
```

### Rate Limiting

The Twist API has rate limits. We should implement:

- Exponential backoff for rate limit errors
- Respect rate limit headers in responses
- Queue requests to avoid hitting limits

### Pagination

List endpoints support pagination via query parameters:

- `limit`: Number of items per page
- `cursor`: Pagination cursor for next page

### Error Handling

Common error scenarios to handle:

- Invalid authentication token
- Workspace/channel/thread not found
- Rate limiting
- Network timeouts
- Invalid request parameters

## Tool Descriptions

Each tool should have clear, user-friendly descriptions following the pattern in TOOL_DESCRIPTIONS_GUIDE.md:

- Include examples of when to use the tool
- Document all parameters clearly
- Provide sample responses
- Note any limitations or special behaviors

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
