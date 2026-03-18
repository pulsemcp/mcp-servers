# Zoom MCP Server

## Overview

MCP server for Zoom meeting and recording management. Provides tools for listing meetings, getting meeting details, and listing cloud recordings.

## Architecture

- **shared/src/server.ts** - Server factory with IZoomClient interface and dependency injection
- **shared/src/tools.ts** - Tool registration with group-based filtering
- **shared/src/tools/** - Individual tool implementations (list-meetings, get-meeting, list-recordings)
- **shared/src/zoom-client/** - Zoom API client with per-method modules in lib/
- **local/src/index.ts** - Main entry point with environment validation
- **local/src/index.integration-with-mock.ts** - Integration test entry point

## Testing

- **Functional tests**: `npm test` - Unit tests with mocked ZoomClient
- **Integration tests**: `npm run test:integration` - Full MCP protocol tests via TestMCPClient
- **Manual tests**: `npm run test:manual` - Real API tests (requires `.env` with credentials)

## Environment Variables

- `ZOOM_ACCESS_TOKEN` (required) - Zoom OAuth access token
- `ENABLED_TOOLGROUPS` (optional) - Comma-separated tool groups filter
