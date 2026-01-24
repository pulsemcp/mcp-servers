# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Pulse Sub-Registry MCP server.

## Overview

Pulse Sub-Registry is an MCP server that provides access to the PulseMCP Sub-Registry, allowing users to browse and discover MCP servers programmatically.

## Architecture

The server uses a two-layer architecture:

1. **`shared/`**: Core business logic
   - `client.ts`: PulseMCP API client with authentication
   - `tools.ts`: Tool registration using MCP SDK patterns
   - `tools/`: Individual tool implementations
   - `types.ts`: TypeScript type definitions for API responses

2. **`local/`**: Stdio transport implementation
   - Minimal wrapper around shared functionality
   - Uses StdioServerTransport for Claude Desktop integration
   - References shared via development symlink

## Development Commands

### Shared Module

```bash
cd shared
npm install
npm run build
```

### Local Module

```bash
cd local
npm install
npm run build     # Automatically builds shared first
npm start         # Run production server
npm run dev       # Development with auto-reload (builds shared first)
```

## Implementation Notes

- The prebuild/predev scripts ensure shared is always built first
- All new features should be added to the shared module
- The local module is a thin wrapper that registers shared functionality
- Environment variable `PULSEMCP_SUBREGISTRY_API_KEY` is required for production use

## API Integration

The server integrates with the PulseMCP Sub-Registry API v0.1:

- Base URL: `https://api.pulsemcp.com`
- Authentication: `X-API-Key` header
- Optional: `X-Tenant-ID` header for multi-tenant scenarios

### Endpoints Used

- `GET /v0.1/servers` - List servers with pagination and search
- `GET /v0.1/servers/{name}/versions/{version}` - Get specific server version

## Testing Strategy

- **Functional tests**: Unit tests with mocked client (`tests/functional/`)
- **Integration tests**: Full MCP protocol tests using TestMCPClient (`tests/integration/`)

Run tests with:

```bash
npm run test:run        # Unit tests
npm run test:integration # Integration tests
npm run test:all        # Both
```

## Claude Learnings

### API Client Design

- Use dependency injection pattern with `ClientFactory` for easy testing
- Handle all error responses explicitly (401, 403, 404, 429)
- Parse error messages from JSON response bodies when available

### Tool Implementation

- Follow the standard pattern: return object with `{ name, description, inputSchema, handler }`
- Use Zod for parameter validation
- Return `{ content: [...], isError: true }` for errors, don't throw
- Output raw JSON for debugging and inspection (auto-truncation handles large responses)

### Testing

- Use mock client factory pattern for functional tests
- Integration tests use `index.integration-with-mock.ts` entry point
- Environment variables control mock behavior in integration tests
