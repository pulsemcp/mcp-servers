# Manual Testing Results

This file tracks the **most recent** manual test results for the Pulse Fetch MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **⚠️ IMPORTANT: Commit your changes BEFORE running tests**

   The test results will reference the current commit hash. If you have uncommitted changes, the commit hash will not represent what was actually tested:

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. **Set up API credentials** - Ensure you have the necessary API credentials in your `.env` file:
   ```bash
   # Copy from .env.example and add your real API keys
   FIRECRAWL_API_KEY=your-key-here
   BRIGHTDATA_API_KEY=your-key-here
   ```

### Running Tests

Run manual tests (automatically builds and tests against built code):

```bash
npm run test:manual
```

Or run specific test suites:

```bash
npm run test:manual:pages        # Pages test suite
npm run test:manual:features     # Features test suite
```

## Latest Test Results

**Test Date:** 2025-07-04 00:09 PT  
**Branch:** tadasant/bump-all-versions  
**Commit:** 35cd9db  
**Tested By:** Claude  
**Environment:** Local development with API keys from .env (FIRECRAWL_API_KEY, BRIGHTDATA_API_KEY, LLM_API_KEY)

### Pages Test Results

**Overall:** 20/20 tests passed (100%)

**Tests Run:** 20/20 tests completed

**By Configuration:**

- ✅ Native Only: 4/4 passed
- ✅ Firecrawl Only: 4/4 passed
- ✅ BrightData Only: 4/4 passed
- ✅ All Services (Cost Optimized): 4/4 passed
- ✅ All Services (Speed Optimized): 4/4 passed

**By Page:**

- ✅ GitHub homepage: 5/5 passed (all strategies working correctly)
- ✅ Simple HTML example page: 5/5 passed
- ✅ HTTP 403 error page: 5/5 passed (correctly failed with all strategies)
- ✅ HTTP 500 error page: 5/5 passed (correctly failed with all strategies)

**Details:**

- All tests passed with expected strategies
- Strategy isolation working correctly after fixing parameter name (saveResult → resultHandling)
- BrightData working after fixing environment variable name (BRIGHTDATA_BEARER_TOKEN → BRIGHTDATA_API_KEY)

### Features Test Results

**Overall:** 16/16 tests passed (100%)

**All Passed (with full API key coverage):**

- ✅ authentication-healthcheck.test.ts: All 5 tests passed
  - Firecrawl authentication successful with API key
  - BrightData authentication successful with API key
  - Test framework correctly validated all credentials
- ✅ scrape-tool.test.ts: All 3 tests passed
  - Basic scraping with automatic strategy selection working
  - Error handling working correctly (19s timeout test)
  - Content extraction with Anthropic LLM successful
- ✅ brightdata-scraping.test.ts: 1 test passed
  - BrightData client successfully scraped example.com (14s)
- ✅ firecrawl-scraping.test.ts: 1 test passed
  - Firecrawl client successfully scraped and converted to markdown (6s)
- ✅ native-scraping.test.ts: 2 tests passed
  - Native HTTP client working correctly
  - Successfully scraped example.com
- ✅ extract.test.ts: 3 tests passed
  - Anthropic extraction working with real API
  - Successfully extracted structured data from HTML
- ✅ test-filtering.test.ts: 1 test passed
  - HTML filtering working (78% content reduction achieved)

**Summary:** All tests passed with full API key coverage. All scraping strategies (Native, Firecrawl, BrightData) and LLM extraction (Anthropic) verified working correctly with real external APIs.
