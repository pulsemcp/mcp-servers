# MCP Server Testing

This directory contains functional and integration tests for the MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   └── NAME.integration.test.ts  # Full server integration tests
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

- Creates a real TestMCPClient instance that communicates via stdio
- Uses an explicit mock implementation of external dependencies
- Tests the full MCP protocol stack with controlled mock responses

## Integration Testing Architecture

### Overview

Integration tests use a real MCP client (`TestMCPClient`) to test the full MCP protocol while mocking only the external API dependencies. This approach clearly demonstrates that we're testing the MCP implementation, not mocking the MCP client itself.

### Components

1. **TestMCPClient** - Real MCP client that communicates with the server via stdio
2. **Mock External Client** - Mock implementation of external APIs (e.g., `example-client.integration-mock.ts`)
3. **Integration Entry Point** - Special server entry (`index.integration-with-mock.ts`) that uses the mock client
4. **Environment Variables** - Used to pass mock data configuration to the server

### How It Works

1. Test creates a mock external client with specific test data:

   ```typescript
   const mockExampleClient = createIntegrationMockExampleClient({
     items: { 'item-123': { id: 'item-123', name: 'Test Item' } },
   });
   ```

2. Test creates a TestMCPClient that will use this mock:

   ```typescript
   const client = await createTestMCPClientWithMock(mockExampleClient);
   ```

3. The helper function:

   - Extracts mock data from the mock client
   - Passes it via environment variable to the server
   - Points to the special integration entry point
   - Creates and connects the TestMCPClient

4. Server uses the mock client factory instead of real external APIs

5. Tests interact with the server through the real MCP protocol

### Example

```typescript
// Create a mock external client with custom data
const mockExampleClient = createIntegrationMockExampleClient({
  searchResponses: {
    'user:john': [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'John Smith', email: 'jsmith@example.com' },
    ],
  },
});

// Create TestMCPClient that will use our mock
const client = await createTestMCPClientWithMock(mockExampleClient);

// Call the MCP tool (real MCP protocol communication)
const result = await client.callTool('search_users', { query: 'user:john' });

// Verify the results
const users = JSON.parse(result.content[0].text);
expect(users).toHaveLength(2);
expect(users[0].name).toBe('John Doe');
```

### Key Benefits

1. **Clear separation of concerns** - We're explicitly mocking only external APIs, not the MCP protocol
2. **Real protocol testing** - All MCP communication uses the actual protocol implementation
3. **Flexible test scenarios** - Each test can define exactly what the external API should return
4. **No vitest dependency in mocks** - Integration mocks are plain TypeScript, making them reusable

## Writing Tests

### Functional Tests

1. Import the function/tool to test
2. Create mocks for any dependencies
3. Test the function with various inputs
4. Assert on outputs and mock calls

### Integration Tests

1. Create a mock external client with test-specific data
2. Use the helper to create a TestMCPClient with this mock
3. Call tools/resources through the real MCP protocol
4. Assert on the responses

## Best Practices

1. Keep functional tests focused on single units
2. Use integration tests to verify protocol compliance
3. Mock external dependencies consistently
4. Test error cases and edge conditions
5. Use descriptive test names that explain the scenario
