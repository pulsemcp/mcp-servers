# Cloud Storage MCP Server Testing

This directory contains functional and integration tests for the Cloud Storage MCP server using Vitest.

## Test Structure

```
tests/
├── functional/          # Functional tests for individual components
│   └── tools.test.ts   # Tests for MCP tool implementations
├── integration/        # Integration tests using TestMCPClient
│   └── cloud-storage.integration.test.ts  # Full server integration tests
├── manual/             # Manual tests that hit real GCS APIs
│   └── cloud-storage.manual.test.ts  # Tests with real GCS calls
└── mocks/              # Mock implementations and test data
    └── storage-client.functional-mock.ts  # Mock storage client for functional tests
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

### Manual Tests

```bash
# First time setup
npm run test:manual:setup

# Run manual tests (requires real GCS credentials in .env)
npm run test:manual
```

**Important**: Manual tests require real GCS credentials and are NOT run in CI.

## Test Architecture

### Mock Storage Client

The tests use a mock storage client for testing without hitting real GCS:

```typescript
// Create a mock client with initial data
const mockClient = createMockStorageClient({
  'test.txt': { content: 'Hello', contentType: 'text/plain' },
  'data/config.json': { content: '{}', contentType: 'application/json' },
});

// Inject it into the tools
const registerTools = createRegisterTools(() => mockClient);
```

### Integration Testing Architecture

Integration tests use `TestMCPClient` to test the full MCP protocol while using a mock storage client:

1. **TestMCPClient** - Real MCP client that communicates with the server via stdio
2. **Mock Storage Client** - In-memory implementation of `IStorageClient`
3. **Integration Entry Point** - Special server entry (`index.integration-with-mock.ts`) that uses mock client
4. **Environment Variables** - Used to pass initial mock data to the server

### How It Works

1. Test creates mock data configuration:

   ```typescript
   const mockData = {
     files: {
       'docs/readme.md': { content: '# README', contentType: 'text/markdown' },
     },
   };
   ```

2. Test creates a TestMCPClient with this mock data:

   ```typescript
   const client = await createTestMCPClientWithMock(mockData);
   ```

3. Server receives mock data via environment variable and uses mock storage client

4. Tests interact with the server through the real MCP protocol

## Manual Testing

### Setup

1. Create a `.env` file in the server root:

   ```bash
   GCS_BUCKET=your-test-bucket
   GCS_KEY_FILE=/path/to/service-account.json
   ```

2. Run manual tests:
   ```bash
   npm run test:manual
   ```

### Test Outcomes

Manual tests report detailed outcomes:

- **✅ SUCCESS**: Test passed, GCS responded as expected
- **⚠️ WARNING**: Test passed but with unexpected behavior worth investigating
- **❌ FAILURE**: Test failed, GCS error or unexpected response

### Cleanup

Manual tests create files with a unique timestamp prefix and clean up after themselves. If tests fail mid-run, you may need to manually delete test files from your bucket.

## Best Practices

1. Keep functional tests focused on single units
2. Use integration tests to verify protocol compliance
3. Use the mock storage client for most testing
4. Run manual tests before major releases
5. Document expected outcomes in manual tests
