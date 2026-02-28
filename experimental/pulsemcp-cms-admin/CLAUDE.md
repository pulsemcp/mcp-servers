# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the PulseMCP CMS Admin MCP server.

## Overview

Internal MCP server for managing PulseMCP's newsletter content. Requires `PULSEMCP_ADMIN_API_KEY` environment variable.

## API Integration

- **Production** Base URL: `https://admin.pulsemcp.com`
- **Staging** Base URL: `https://admin.staging.pulsemcp.com`
- Authentication: `X-API-Key` header
- See `shared/src/types.ts` for field definitions
- See tool implementations in `shared/src/tools/` for API endpoints

The Rails application supports JSON responses for all resources via the supervisor namespace. The MCP server uses real API calls for all operations including posts, authors, MCP servers, and MCP clients.

## Manual Testing

**Manual tests MUST run against staging, not production.** Set both variables in your `.env`:

```
PULSEMCP_ADMIN_API_KEY=your-staging-api-key
PULSEMCP_ADMIN_API_URL=https://admin.staging.pulsemcp.com
```

The default API URL is production (`admin.pulsemcp.com`). Without `PULSEMCP_ADMIN_API_URL`, tests will hit production and fail with "Invalid API key" if you have a staging key (or worse, mutate production data if you have a production key).

## Key Implementation Details

### Server Architecture

- Uses dependency injection pattern for testability
- API client in `shared/src/pulsemcp-admin-client/`
- Tool implementations in `shared/src/tools/`
- Integration tests use mock client via environment variables

### Error Handling

- 401: Invalid API key
- 403: User lacks admin privileges
- 422: Validation failures
- 404: Resource not found

## Logging

Use the centralized logging module (`shared/src/logging.ts`) - never use `console.log` directly. All logs go to stderr to maintain MCP protocol compliance.
