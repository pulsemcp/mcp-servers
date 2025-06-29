# Pulse Fetch MCP Server Tests

This directory contains the test suite for the Pulse Fetch MCP server.

## Test Structure

- `functional/` - Unit tests with mocked dependencies
- `integration/` - Full MCP protocol tests with mocked external services
- `manual/` - End-to-end tests using real external APIs (not run in CI)
- `mocks/` - Mock implementations for testing

## Test Types

### Functional Tests

Located in `functional/`, these tests verify individual tools and components in isolation with all external dependencies mocked.

- `scrape-tool.test.ts` - Tests the scrape tool logic and fallback behavior

### Integration Tests

Located in `integration/`, these tests verify the complete MCP protocol interaction using TestMCPClient with mocked external services.

- `pulse-fetch.integration.test.ts` - Tests full MCP server functionality

### Manual Tests

Located in `manual/`, these tests hit real external APIs and require actual API credentials. They are not run in CI.

To run manual tests:

```bash
# Set up environment variables first
export FIRECRAWL_API_KEY="your-real-firecrawl-key"
export BRIGHTDATA_BEARER_TOKEN="Bearer your-real-brightdata-token"

# Run manual tests
npm run test:manual
```

## Running Tests

```bash
# Run functional tests in watch mode
npm test

# Run all functional tests once
npm run test:run

# Run integration tests
npm run test:integration

# Run all tests (functional + integration)
npm run test:all

# Run tests with UI
npm run test:ui
```

## Test Coverage

The test suite covers:

- ✅ Scrape tool functionality with all fallback strategies
- ✅ Input validation and error handling
- ✅ Content truncation and pagination
- ✅ MCP protocol compliance
- ✅ Server lifecycle and capabilities
- ✅ Tool registration and execution

## Mock Structure

The mocks simulate:

- **Native Fetcher**: Direct HTTP requests with configurable responses
- **Firecrawl Client**: Firecrawl API responses with structured data
- **BrightData Client**: BrightData Web Unlocker responses

Mocks can be configured via environment variables in integration tests or directly in functional tests.
