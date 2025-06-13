# MCP Server Testing

This directory contains functional and integration tests for the MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   ├── NAME.integration.test.ts  # Full server integration tests
│   └── integration-test-helper.ts # Helper for creating test clients with mocks
└── mocks/              # Mock implementations and test data
    └── example-client.functional-mock.ts  # Vitest mocks for functional tests
```

## Running Tests

From the server directory:

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

The tests use dependency injection to mock external clients/services:

```typescript
// Create a mock client
const mockClient = createMockClient();

// Inject it into the tools
const registerTools = createRegisterTools(() => mockClient);
```

### Mock Organization

#### Functional Tests (`mocks/`)

- Creates vitest mock implementations with `vi.fn()`
- Used for testing individual functions/tools in isolation
- Mocks are injected directly into the code being tested

#### Integration Tests (`integration/`)

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
  // Define your mock data structure here
  items: {
    'item-123': { id: 'item-123', name: 'Test Item', ... }
  }
});

const result = await client.callTool('get_item', { itemId: 'item-123' });
```

## Writing Tests

### Functional Tests

1. Import the function/tool to test
2. Create mocks for any dependencies
3. Test the function with various inputs
4. Assert on outputs and mock calls

### Integration Tests

1. Define mock data for your test scenario
2. Create a test client with the mocks
3. Call tools/resources through the MCP protocol
4. Assert on the responses

## Best Practices

1. Keep functional tests focused on single units
2. Use integration tests to verify protocol compliance
3. Mock external dependencies consistently
4. Test error cases and edge conditions
5. Use descriptive test names that explain the scenario
