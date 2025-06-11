# AppSignal MCP Server Testing

This directory contains unit tests for the AppSignal MCP server using Vitest.

## Test Structure

```
tests/
├── unit/                # Unit tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
└── mocks/              # Mock implementations and test data
    └── appsignal-client.mock.ts
```

## Running Tests

From the `experimental/appsignal` directory:

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run tests with UI (opens in browser)
npm run test:ui
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
Mock data is centralized in `mocks/appsignal-client.mock.ts`:# Testing CI trigger
