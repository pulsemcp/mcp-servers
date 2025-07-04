# AppSignal MCP Server Testing

This directory contains functional and integration tests for the AppSignal MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   └── appsignal.integration.test.ts  # Full server integration tests
├── manual/             # Manual tests that hit real AppSignal API
│   └── appsignal.manual.test.ts  # Tests with real API calls
└── mocks/              # Mock implementations and test data
    └── appsignal-client.functional-mock.ts  # Vitest mocks for functional tests

shared/src/appsignal-client/
├── appsignal-client.ts    # AppSignal client interface and implementation
└── appsignal-client.integration-mock.ts  # Integration test mock implementation
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

### Manual Tests

```bash
# IMPORTANT: Use .env files in the MCP server's source root for API keys
# Copy .env.example to .env if it doesn't exist
cp .env.example .env
# Edit .env to add your real AppSignal API key:
# APPSIGNAL_API_KEY=your-real-api-key

# Run manual tests (hits real AppSignal API)
npm run test:manual

# Run manual tests in watch mode
npm run test:manual:watch
```

**Important:**

- Manual tests MUST use API keys from the `.env` file in the MCP server's source root
- Manual tests require a valid APPSIGNAL_API_KEY and hit the real production API
- Tests automatically discover and use your AppSignal apps - no manual ID configuration needed
- These are end-to-end system tests that chain together real API calls
- These tests are not run in CI

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

#### Integration Tests (`integration/appsignal.integration.test.ts`)

- Uses real TestMCPClient instances to test the full MCP protocol stack
- Creates mock AppSignal clients with `createIntegrationMockAppsignalClient`
- Mock data is passed to the test server via environment variables
- Tests demonstrate that we're mocking the AppSignal API calls, not the MCP client

#### Manual Tests (`manual/appsignal.manual.test.ts`)

- Uses real TestMCPClient instances with the actual server implementation
- **No mocking** - hits the real AppSignal production API
- Requires valid APPSIGNAL_API_KEY environment variable
- End-to-end system tests that chain together realistic workflows:
  - Get apps → Select app → Search logs → Test error handling
- Tests automatically adapt to available data in your AppSignal account
- Provides detailed console output showing actual API interactions
- Should be run when modifying AppsignalClient or API interaction code

## Integration Testing Architecture

### Overview

Integration tests use a real MCP client (`TestMCPClient`) to communicate with a test version of the server that uses configurable mocked external dependencies.

### Components

1. **TestMCPClient** - Located at `/libs/test-mcp-client`, provides a programmatic interface to test MCP servers
2. **Integration build** - Special build of the server (`index.integration-with-mock.js`) that uses mocked dependencies
3. **Configurable mocks** - Each test can define its own mock responses via environment variables

### How It Works

1. Each test creates a mock AppSignal client using `createIntegrationMockAppsignalClient`
2. The mock client is passed to `createTestMCPClientWithMock` helper
3. Mock configuration is passed via environment variable to the server
4. TestMCPClient spawns the server process via stdio
5. Tests interact with the server through the MCP protocol
6. Server responds with the configured mock data

### Example

```typescript
// Create a mock AppSignal client with custom mock data
const mockAppSignalClient = createIntegrationMockAppsignalClient({
  exceptionIncidents: {
    'payment-failure': {
      id: 'payment-failure',
      name: 'PaymentGatewayException',
      message: 'Connection timeout to payment gateway',
      count: 42,
      lastOccurredAt: '2024-01-21T09:00:00Z',
      status: 'open',
    },
  },
});

// Create TestMCPClient that will use our mocked AppSignal client
const client = await createTestMCPClientWithMock(mockAppSignalClient);

// Call the MCP tool
const result = await client.callTool('get_exception_incident', {
  incidentNumber: 'payment-failure',
});
```
