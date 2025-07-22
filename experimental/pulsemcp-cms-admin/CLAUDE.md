# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the PulseMCP CMS Admin MCP server.

## Overview

Internal MCP server for managing PulseMCP's newsletter content. Requires `PULSEMCP_ADMIN_API_KEY` environment variable.

## API Integration

- Base URL: `https://admin.pulsemcp.com`
- Authentication: `X-API-Key` header
- See `shared/src/types.ts` for field definitions
- See tool implementations in `shared/src/tools/` for API endpoints

The Rails application supports JSON responses for posts operations via both the admin and supervisor namespaces. Authors, MCP servers, and MCP clients endpoints are not yet available via the API, so the MCP server provides mock data for these resources.

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
