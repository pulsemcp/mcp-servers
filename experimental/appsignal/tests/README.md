# AppSignal MCP Server Testing

This directory contains functional and integration tests for the AppSignal MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   └── appsignal.integration.test.ts  # Full server integration tests
└── mocks/              # Mock implementations and test data
    └── appsignal-client.mock.ts
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

### Mock Data
Mock data is centralized in `mocks/appsignal-client.mock.ts`:
- Used by functional tests via vitest mocking
- Used by integration tests via a separate mock implementation in `shared/src/mocks/`

## Integration Testing Architecture

### Overview
Integration tests use a real MCP client (`TestMCPClient`) to communicate with a test version of the server that uses mocked external dependencies.

### Components
1. **TestMCPClient** - Located at `/test-mcp-client`, provides a programmatic interface to test MCP servers
2. **Integration build** - Special build of the server (`index.integration.js`) that uses mocked dependencies
3. **Mocked AppSignal client** - Provides predictable responses for testing

### How It Works
1. Build the server with mocked dependencies
2. TestMCPClient spawns the server process via stdio
3. Tests interact with the server through the MCP protocol
4. Server responds with mocked data instead of making real API calls
