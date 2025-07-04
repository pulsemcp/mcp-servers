# Manual Tests for Pulse Fetch

This directory contains manual tests for the Pulse Fetch MCP server. These tests interact with real external services and APIs, so they are not included in the automated test suite.

## Test Organization

Tests are organized into two main categories:

- **`features/`** - Individual feature tests for specific functionality
- **`pages/`** - External page validation tests across different environment configurations
- **`all-features.manual.test.ts`** - Runs all tests in the features directory

## Prerequisites

Before running manual tests, you MUST use API keys from the `.env` file in the MCP server's source root:

```bash
# IMPORTANT: Use .env files for all API credentials
# Copy .env.example to .env if it doesn't exist
cp .env.example .env

# Edit .env to add your API keys:
# For Firecrawl tests
# FIRECRAWL_API_KEY=your-firecrawl-api-key

# For BrightData tests
# BRIGHTDATA_API_KEY=your-brightdata-api-key

# For LLM/Extract tests
# LLM_PROVIDER=anthropic  # or "openai", "openai-compatible"
# LLM_API_KEY=your-llm-api-key

# For OpenAI-compatible providers
# LLM_BASE_URL=https://your-provider-api.com/v1
# LLM_MODEL=your-model-name
```

**Note**: The `.env` file is automatically loaded when running manual tests. Never export API keys directly in your shell or commit them to version control.

Also ensure you've built the project:

```bash
npm run build
```

## Quick Start

### Run All Feature Tests

```bash
# From pulse-fetch directory
npm run test:manual
```

This runs all tests in the `features/` directory using vitest.

### Run Page Validation Tests

```bash
# Test pages across all environment configurations
node --import tsx tests/manual/pages/pages.manual.test.ts

# Continue testing even after failures
node --import tsx tests/manual/pages/pages.manual.test.ts --continue-on-failure
```

## Feature Tests

All commands should be run from the `productionized/pulse-fetch` directory.

### 1. Native Scraping Client Test

Tests the basic HTTP fetching functionality without any external services.

```bash
npm run test:manual -- tests/manual/features/native-scraping.test.ts
```

**What it validates:**

- Basic HTTP request/response handling
- Content-Type detection
- HTML content extraction
- Error handling for failed requests

### 2. Firecrawl Scraping Client Test

Tests integration with the Firecrawl API for enhanced content extraction.

```bash
# Requires FIRECRAWL_API_KEY
npm run test:manual -- tests/manual/features/firecrawl-scraping.test.ts
```

**What it validates:**

- Firecrawl API authentication
- Markdown conversion quality
- Main content extraction (removing ads/navigation)
- Screenshot capture (if available)

### 3. BrightData Scraping Client Test

Tests integration with BrightData Web Unlocker for anti-bot protected sites.

```bash
# Requires BRIGHTDATA_API_KEY
npm run test:manual -- tests/manual/features/brightdata-scraping.test.ts
```

**What it validates:**

- BrightData API authentication
- Anti-bot bypass capabilities
- JavaScript rendering support
- Cookie and session handling

### 4. Extract Tests

Tests LLM extraction functionality across different providers.

```bash
# Requires LLM_PROVIDER and LLM_API_KEY
npm run test:manual -- tests/manual/features/extract.test.ts
```

**What it validates:**

- Basic extraction from scraped content
- LLM provider configuration
- Simple prompt handling

The extract test file includes tests for all providers:

```bash
# Anthropic Claude
export LLM_PROVIDER="anthropic"
export LLM_API_KEY="your-anthropic-api-key"
npm run test:manual -- tests/manual/features/extract.test.ts

# OpenAI
export LLM_PROVIDER="openai"
export LLM_API_KEY="your-openai-api-key"
npm run test:manual -- tests/manual/features/extract.test.ts

# OpenAI-compatible (e.g., Groq, Together, etc.)
export LLM_PROVIDER="openai-compatible"
export LLM_API_KEY="your-api-key"
export LLM_BASE_URL="https://api.groq.com/openai/v1"
export LLM_MODEL="mixtral-8x7b-32768"
npm run test:manual -- tests/manual/features/extract.test.ts
```

### 5. Scrape Tool Test

Tests the main scrape tool with automatic strategy selection, error handling, and extraction support.

```bash
npm run test:manual -- tests/manual/features/scrape-tool.test.ts
```

**Test scenarios:**

- Automatic strategy selection
- Error handling for failed requests
- Content extraction when LLM is configured

### 6. Content Filtering Test

Tests the content filtering functionality for extract operations.

```bash
npm run test:manual:features -- tests/manual/features/test-filtering.test.ts
```

**What it validates:**

- HTML to Markdown conversion with filtering
- Main content extraction
- Removal of navigation, ads, and boilerplate
- Preservation of semantic structure

## Page Validation Tests

The `pages/` directory contains a configurable test suite that validates multiple pages across different environment configurations.

### Configuration

Edit `pages/test-config.ts` to modify:

- **TEST_PAGES**: List of URLs to test with expected outcomes
- **ENV_CONFIGS**: Different environment variable combinations to test

### Features

- Tests pages with different service availability (native only, Firecrawl only, etc.)
- Validates expected pass/fail outcomes for each page/config combination
- Supports fail-fast or continue-on-failure modes
- Provides detailed reporting by configuration and by page

## Client Architecture

Each test uses the corresponding scraping client class:

- `NativeScrapingClient` - Direct HTTP fetching with fetch API
- `FirecrawlScrapingClient` - Wrapper around Firecrawl API
- `BrightDataScrapingClient` - Wrapper around BrightData Web Unlocker API

All clients follow the same interface pattern with:

- Constructor accepting API credentials
- `scrape(url, options)` method returning standardized result objects
- Proper error handling and type safety

## Test Output

Each test provides detailed output including:

- ✅/❌ Success/failure indicators
- Response times and performance metrics
- Content analysis (title tags, JavaScript presence, etc.)
- Extracted content previews
- Error messages with full stack traces

## Debugging Tips

1. **Enable verbose logging**: Set `DEBUG=pulse-fetch:*` to see detailed logs
2. **Import Errors**: Make sure you're running from the correct directory (`productionized/pulse-fetch`)
3. **API Key Issues**: Check your `.env` file format and ensure keys are properly set
4. **Build Issues**: Run `npm run build` if you see module resolution errors
5. **Rate Limiting**: Tests include delays, but be mindful of API rate limits
6. **Save scraped content**: Tests save content to `temp-results/` for inspection

## Expected Behavior

- **Native Client**: Should work on most simple sites, may fail on heavily protected or JavaScript-dependent sites
- **Firecrawl Client**: Excellent for content extraction, provides clean markdown, may be blocked by some anti-bot measures
- **BrightData Client**: Should work on protected sites, provides raw HTML, best for bypassing bot detection

## Adding New Tests

When adding new manual tests:

1. Place feature tests in the `features/` directory
2. Follow the naming convention: `feature-name.test.ts`
3. Use vitest's `describe` and `it` blocks for test structure
4. Include clear documentation about required environment variables
5. Update this README with usage examples
