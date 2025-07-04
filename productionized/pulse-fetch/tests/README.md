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
# IMPORTANT: Use .env files in the MCP server's source root for API keys
# Copy .env.example to .env if it doesn't exist
cp .env.example .env
# Edit .env to add your real API keys:
# FIRECRAWL_API_KEY=your-real-firecrawl-key
# BRIGHTDATA_API_KEY=your-real-brightdata-api-key
# LLM_PROVIDER=anthropic
# LLM_API_KEY=your-llm-api-key

# Run manual tests
npm run test:manual
```

**Note**: The `.env` file is automatically loaded when running manual tests. Never export API keys directly in your shell or commit them to version control.

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

## Mock Structure

The mocks simulate:

- **Native Fetcher**: Direct HTTP requests with configurable responses
- **Firecrawl Client**: Firecrawl API responses with structured data
- **BrightData Client**: BrightData Web Unlocker responses

Mocks can be configured via environment variables in integration tests or directly in functional tests.
