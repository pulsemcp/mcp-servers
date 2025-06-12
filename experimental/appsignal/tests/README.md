# AppSignal MCP Server Testing

This directory contains functional and integration tests for the AppSignal MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   ├── appsignal.integration.test.ts  # Full server integration tests
│   └── integration-test-helper.ts     # Helper for creating test clients with mocks
└── mocks/              # Mock implementations and test data
    └── appsignal-client.functional-mock.ts  # Vitest mocks for functional tests

shared/src/appsignal-client/
├── appsignal-client.ts    # AppSignal client interface and implementation
└── configurable-appsignal-client.integration-mock.ts  # Configurable mocks for integration tests
```

## Running Tests

From the `experimental/appsignal` directory:

### Functional Tests

```bash
# Run functional tests in watch mode (recommended for development)
npm test

# Run functional tests once
npm run test:run

# Run functional tests with UI (opens in browser)
npm run test:ui
```

### Integration Tests

```bash
# Run integration tests (builds everything first)
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run all tests (functional + integration)
npm run test:all
```

## Test Architecture

### Dependency Injection
The tests use dependency injection to mock the `AppsignalClient`:

```typescript
// Create a mock client
const mockClient = createMockAppsignalClient();

// Inject it into the tools
const registerTools = createRegisterTools(() => mockClient);
```

### Mock Organization

#### Functional Tests (`mocks/appsignal-client.functional-mock.ts`)
- Creates vitest mock implementations with `vi.fn()`
- Used for testing individual functions/tools in isolation
- Mocks are injected directly into the code being tested

#### Integration Tests (`integration/integration-test-helper.ts`)
- Helper that creates a real TestMCPClient instance
- Configures mock data that gets passed to the test server via environment variables
- Tests the full MCP protocol stack with mocked external dependencies

## Integration Testing Architecture

### Overview
Integration tests use a real MCP client (`TestMCPClient`) to communicate with a test version of the server that uses configurable mocked external dependencies.

### Components
1. **TestMCPClient** - Located at `/test-mcp-client`, provides a programmatic interface to test MCP servers
2. **Integration build** - Special build of the server (`index.integration.js`) that uses mocked dependencies
3. **Configurable mocks** - Each test can define its own mock responses via environment variables

### How It Works
1. Each test defines its mock responses using the `createMockedClient` helper
2. Mock configuration is passed via environment variable to the server
3. TestMCPClient spawns the server process via stdio
4. Tests interact with the server through the MCP protocol
5. Server responds with the configured mock data

### Example
```typescript
const client = await createMockedClient({
  alerts: {
    'alert-123': { id: 'alert-123', status: 'active', ... }
  },
  searchResponses: {
    'error': [{ level: 'error', message: '...', ... }]
  }
});

const result = await client.callTool('get_alert_details', { alertId: 'alert-123' });
```
