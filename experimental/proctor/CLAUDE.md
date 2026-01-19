# CLAUDE.md - Proctor MCP Server

## Overview

This is the Proctor MCP Server, which provides tools for managing Proctor exams against MCP servers. It integrates with the PulseMCP Proctor API to manage results and control exam infrastructure.

## Architecture

### Directory Structure

```
proctor/
├── local/           # Entry point and npm bin
│   └── src/
│       ├── index.ts                    # Main entry point
│       └── index.integration-with-mock.ts  # Integration test entry
├── shared/          # Business logic (shared module)
│   └── src/
│       ├── index.ts       # Exports
│       ├── server.ts      # MCP server factory and client
│       ├── tools.ts       # Tool registration
│       ├── types.ts       # TypeScript types
│       ├── logging.ts     # Logging utilities
│       ├── tools/         # Individual tool implementations
│       │   ├── get-metadata.ts
│       │   ├── run-exam.ts
│       │   ├── get-machines.ts
│       │   ├── destroy-machine.ts
│       │   └── cancel-exam.ts
│       └── proctor-client/lib/  # API client methods
│           ├── get-metadata.ts
│           ├── run-exam.ts
│           ├── get-machines.ts
│           ├── destroy-machine.ts
│           └── cancel-exam.ts
├── tests/
│   ├── functional/      # Unit tests with mocks
│   ├── integration/     # MCP protocol tests
│   ├── manual/          # Real API tests
│   └── mocks/           # Mock implementations
└── scripts/             # Build and test scripts
```

### Key Patterns

1. **Client Interface**: `IProctorClient` defines the API contract
2. **Dependency Injection**: Tools receive `clientFactory` for testability
3. **Tool Groups**: Tools are organized into groups (exams, machines) with read-only variants

## Development

### Commands

```bash
npm run install-all    # Install all dependencies
npm run build          # Build the project
npm run dev            # Development mode
npm run test           # Run functional tests
npm run test:integration  # Run integration tests
npm run test:manual    # Run manual tests (requires API key)
```

### Environment Variables

- `PROCTOR_API_KEY` (required): API key for authentication
- `PROCTOR_API_URL` (optional): Base URL (default: https://admin.pulsemcp.com)
- `TOOL_GROUPS` (optional): Comma-separated tool groups to enable

### Adding New Tools

1. Create tool file in `shared/src/tools/`
2. Add API method in `shared/src/proctor-client/lib/`
3. Add to `IProctorClient` interface in `server.ts`
4. Implement in `ProctorClient` class
5. Register in `tools.ts` with appropriate group
6. Add tests

## API Endpoints Used

This server connects to the PulseMCP Proctor API:

- `GET /api/proctor/metadata` - Available runtimes and exams
- `POST /api/proctor/run_exam` - Run Proctor exams
- `GET /api/proctor/machines` - List Fly machines
- `DELETE /api/proctor/machines/:id` - Delete machine
- `POST /api/proctor/cancel_exam` - Cancel running exam

Authentication uses `X-API-Key` header with admin tenant privileges.
