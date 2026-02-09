# Vercel MCP Server

## Project Structure

```
vercel/
├── shared/src/
│   ├── index.ts              # Main exports
│   ├── server.ts             # Server factory, IVercelClient interface, VercelClient class
│   ├── tools.ts              # Tool registration with readonly/readwrite groups
│   ├── types.ts              # Shared TypeScript types for Vercel API responses
│   ├── logging.ts            # Logging utilities (all output to stderr)
│   ├── tools/                # Individual tool implementations
│   │   ├── list-deployments.ts
│   │   ├── get-deployment.ts
│   │   ├── list-projects.ts
│   │   ├── create-deployment.ts
│   │   ├── cancel-deployment.ts
│   │   ├── delete-deployment.ts
│   │   ├── promote-deployment.ts
│   │   ├── rollback-deployment.ts
│   │   ├── get-deployment-events.ts
│   │   └── get-runtime-logs.ts
│   └── vercel-client/        # Vercel REST API client
│       ├── vercel-client.ts
│       ├── vercel-client.integration-mock.ts
│       ├── CLAUDE.md
│       └── lib/              # Individual API methods
├── local/src/
│   ├── index.ts              # Entry point with env validation
│   └── index.integration-with-mock.ts
└── tests/
    ├── functional/           # Unit tests with mocked client
    ├── integration/          # MCP protocol tests with mocked API
    └── manual/               # Real API tests (requires VERCEL_TOKEN)
```

## Environment Variables

- `VERCEL_TOKEN` (required) - Vercel API token
- `VERCEL_TEAM_ID` (optional) - Team ID for team-scoped operations
- `VERCEL_TEAM_SLUG` (optional) - Team URL slug
- `VERCEL_ENABLED_TOOLGROUPS` (optional) - `readonly`, `readwrite` (default: all)

## Key Implementation Details

- **Authentication**: Bearer token via `Authorization` header
- **Base URL**: `https://api.vercel.com`
- **Team scoping**: Appended as query parameters (`teamId`, `slug`)
- **Runtime logs**: Stored for max 1 hour, returned as newline-delimited JSON
- **Build logs**: Retrieved via deployment events endpoint
- **Tool groups**: `readonly` (list/get operations) and `readwrite` (create/cancel/delete/promote/rollback)

## Development Commands

```bash
npm run build          # Build shared + local
npm test               # Run functional tests
npm run test:integration  # Run integration tests
npm run test:manual    # Run manual tests (requires .env)
npm run lint           # Lint from repo root
```

## Logging

Always use logging utilities from `logging.ts`:

```typescript
import { logError, logWarning, logDebug } from './logging.js';
// Never use console.log - stdout is reserved for MCP JSON protocol
```
