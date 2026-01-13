# CLAUDE.md - Fly.io MCP Server

This document provides guidance for Claude Code when working with the Fly.io MCP server.

## Overview

This is an MCP server that provides tools for managing Fly.io applications and machines. It uses the Fly.io Machines REST API.

## Architecture

### Directory Structure

- `local/` - Entry point for stdio transport
- `shared/` - Core business logic, API client, and tools
- `tests/` - Test suites (functional, integration, manual)

### Key Files

- `shared/src/server.ts` - Server factory and client interface
- `shared/src/tools.ts` - Tool registration and grouping
- `shared/src/tools/*.ts` - Individual tool implementations
- `shared/src/fly-io-client/fly-io-client.ts` - Fly.io API client
- `shared/src/fly-io-client/lib/*.ts` - Individual API methods

## API Client Pattern

The Fly.io client uses dynamic imports for lazy loading:

```typescript
async listApps(): Promise<App[]> {
  const { listApps } = await import('./lib/list-apps.js');
  return listApps(this.baseUrl, this.headers);
}
```

Each API method is in its own file under `fly-io-client/lib/` for modularity.

## Testing

### Running Tests

```bash
npm test              # Functional tests (watch mode)
npm run test:run      # Functional tests (once)
npm run test:integration  # Integration tests with TestMCPClient
npm run test:manual   # Real API tests (requires .env)
```

### Test Structure

- **Functional tests** (`tests/functional/`) - Unit tests with mocked client
- **Integration tests** (`tests/integration/`) - Full MCP protocol tests
- **Manual tests** (`tests/manual/`) - Real Fly.io API tests

## Tool Groups

Tools are organized into permission groups:

- `readonly` - list_apps, get_app, list_machines, get_machine
- `write` - create_app, create_machine, update_machine, start_machine, stop_machine
- `admin` - delete_app, delete_machine

Set `ENABLED_TOOLGROUPS` environment variable to restrict access.

## Fly.io API

Base URL: `https://api.machines.dev`

### Key Endpoints Used

- `GET /v1/apps` - List apps
- `GET /v1/apps/{app_name}` - Get app
- `POST /v1/apps` - Create app
- `DELETE /v1/apps/{app_name}` - Delete app
- `GET /v1/apps/{app_name}/machines` - List machines
- `GET /v1/apps/{app_name}/machines/{id}` - Get machine
- `POST /v1/apps/{app_name}/machines` - Create machine
- `POST /v1/apps/{app_name}/machines/{id}` - Update machine
- `DELETE /v1/apps/{app_name}/machines/{id}` - Delete machine
- `POST /v1/apps/{app_name}/machines/{id}/start` - Start machine
- `POST /v1/apps/{app_name}/machines/{id}/stop` - Stop machine

### Rate Limits

- General: 1 req/s (burst 3)
- Get Machine: 5 req/s (burst 10)
- Delete App: 100/minute

## Common Tasks

### Adding a New Tool

1. Create `shared/src/tools/new-tool.ts` following the factory pattern
2. Add to `ALL_TOOLS` array in `shared/src/tools.ts`
3. Add mock method to `tests/mocks/fly-io-client.functional-mock.ts`
4. Update integration mock if needed
5. Add tests
6. Update README.md capabilities table

### Adding a New API Method

1. Create `shared/src/fly-io-client/lib/new-method.ts`
2. Add interface method to `IFlyIOClient`
3. Implement in `FlyIOClient` class using dynamic import
4. Add to integration mock
5. Add tests
