# Contributing to Agent Orchestrator MCP Server

This guide covers development setup and contribution guidelines for the Agent Orchestrator MCP server.

## Getting Started

### Prerequisites

- Node.js 18+
- Access to an Agent Orchestrator instance (local or remote)
- API credentials for the Agent Orchestrator

### Running the server locally

```bash
npm run install-all
npm run build
npm run start
```

## Environment Variables

Create a `.env` file with the following:

```bash
AGENT_ORCHESTRATOR_BASE_URL=http://localhost:3000
AGENT_ORCHESTRATOR_API_KEY=your-api-key-here
```

## Debugging tools

### Running Inspector

Using local build:

```bash
cd experimental/agent-orchestrator
npm run install-all
npm run build
npx @modelcontextprotocol/inspector node local/build/index.js \
  -e AGENT_ORCHESTRATOR_BASE_URL=http://localhost:3000 \
  -e AGENT_ORCHESTRATOR_API_KEY=your-api-key
```

### Claude Desktop

#### Follow logs in real-time

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

This server includes three types of tests:

1. **Functional Tests** (`npm test`) - Unit tests with mocked dependencies
2. **Integration Tests** (`npm run test:integration`) - Tests the full MCP server with mocked API
3. **Manual Tests** (`npm run test:manual`) - Tests against a real Agent Orchestrator instance

### Running Tests

```bash
# Functional tests
npm test

# Integration tests
npm run test:integration

# Manual tests (requires real API credentials and running Agent Orchestrator)
npm run test:manual
```

### Manual Testing

Manual tests are critical for verifying the server works with a real Agent Orchestrator:

- Requires real API credentials in `.env`
- Agent Orchestrator must be running at the configured URL
- Tests verify actual API responses and session management
- Results are tracked in `MANUAL_TESTING.md`

Before creating a version bump, always run manual tests:

```bash
npm run test:manual:setup  # First time setup
npm run test:manual        # Run tests
```

## Publishing

See the main repository's [PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md) for detailed publishing instructions.

Quick summary:

1. Run manual tests and update `MANUAL_TESTING.md`
2. Update version: `npm run stage-publish`
3. Update CHANGELOG.md
4. Commit all changes
5. Push and create PR
6. After merge, GitHub Actions will publish automatically

## Development Tips

- Always run linting from the repository root: `npm run lint`
- Follow the MCP SDK patterns for implementing resources and tools
- Use Zod for input validation
- Include comprehensive error handling
- Use the logging utilities from `shared/src/logging.ts` instead of console.log

## Project Structure

```
agent-orchestrator/
├── shared/           # Core business logic
│   ├── src/
│   │   ├── server.ts         # Server factory
│   │   ├── tools.ts          # Tool registration
│   │   ├── tools/            # Individual tool implementations
│   │   ├── resources.ts      # MCP resources
│   │   ├── types.ts          # TypeScript types
│   │   └── logging.ts        # Logging utilities
│   └── package.json
├── local/            # Stdio transport
│   ├── src/
│   │   └── index.ts          # Server entry point
│   └── package.json
├── tests/            # Test suites
│   ├── functional/           # Unit tests
│   ├── integration/          # Protocol tests
│   └── manual/               # Real API tests
├── package.json      # Root workspace
├── README.md         # User documentation
├── CHANGELOG.md      # Version history
├── CONTRIBUTING.md   # This file
└── .env.example      # Environment template
```
