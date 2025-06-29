# Manual Test Suite for Pulse-Fetch Scraping Clients

This directory contains manual tests for the three scraping client classes: Native, Firecrawl, and BrightData.

## Prerequisites

1. **Environment Variables**: Set up your `.env` file in the pulse-fetch root directory:

   ```bash
   FIRECRAWL_API_KEY=fc-your-api-key-here
   BRIGHTDATA_API_KEY=Bearer your-bearer-token-here
   ```

2. **Dependencies**: Ensure you've built the project:
   ```bash
   npm run build
   ```

## Individual Client Tests

All commands should be run from the `productionized/pulse-fetch` directory.

### Native Scraping Client

```bash
node --import tsx tests/manual/native-scraping.manual.test.ts <url>

# Examples:
node --import tsx tests/manual/native-scraping.manual.test.ts https://example.com
node --import tsx tests/manual/native-scraping.manual.test.ts https://pulsemcp.com
node --import tsx tests/manual/native-scraping.manual.test.ts https://www.yelp.com/biz/dolly-san-francisco
```

**Features tested:**

- Basic HTTP fetching with timeout support
- Response headers and content analysis
- Content type detection and basic HTML parsing

### Firecrawl Scraping Client

```bash
node --import tsx tests/manual/firecrawl-scraping.manual.test.ts <url>

# Examples:
node --import tsx tests/manual/firecrawl-scraping.manual.test.ts https://espn.com
node --import tsx tests/manual/firecrawl-scraping.manual.test.ts https://news.ycombinator.com
```

**Features tested:**

- Enhanced content extraction with markdown output
- Metadata extraction (title, description, etc.)
- Credit usage tracking
- Main content filtering

### BrightData Scraping Client

```bash
node --import tsx tests/manual/brightdata-scraping.manual.test.ts <url>

# Examples:
node --import tsx tests/manual/brightdata-scraping.manual.test.ts https://yelp.com
node --import tsx tests/manual/brightdata-scraping.manual.test.ts https://protected-site.com
```

**Features tested:**

- Anti-bot bypass capabilities
- Raw HTML extraction
- Content statistics and analysis
- Character distribution analysis

## Comprehensive Test Suite

Run all clients against predefined test URLs:

```bash
node --import tsx tests/manual/comprehensive-suite.manual.test.ts
```

This will test:

- **pulsemcp.com** (expected: native)
- **espn.com** (expected: firecrawl)
- **yelp.com** (expected: brightdata)
- **example.com** (expected: native)
- **news.ycombinator.com** (expected: native, firecrawl)

The suite includes:

- Rate limiting between requests (2-second delays)
- Success/failure tracking for each client
- Comprehensive statistics and summary report
- Error handling and logging

## Client Architecture

Each test uses the corresponding scraping client class:

- `NativeScrapingClient` - Direct HTTP fetching with fetch API
- `FirecrawlScrapingClient` - Wrapper around Firecrawl API
- `BrightDataScrapingClient` - Wrapper around BrightData Web Unlocker API

All clients follow the same interface pattern with:

- Constructor accepting API credentials
- `scrape(url, options)` method returning standardized result objects
- Proper error handling and type safety

## Debugging Tips

1. **Import Errors**: Make sure you're running from the correct directory (`productionized/pulse-fetch`)
2. **API Key Issues**: Check your `.env` file format and ensure keys are properly set
3. **Build Issues**: Run `npm run build` if you see module resolution errors
4. **Rate Limiting**: The comprehensive suite includes delays, but individual tests don't - be mindful of API rate limits

## Expected Behavior

- **Native Client**: Should work on most simple sites, may fail on heavily protected or JavaScript-dependent sites
- **Firecrawl Client**: Excellent for content extraction, provides clean markdown, may be blocked by some anti-bot measures
- **BrightData Client**: Should work on protected sites, provides raw HTML, best for bypassing bot detection

Each client provides detailed output including content previews, metadata, and analysis to help you understand how different scraping approaches behave with various types of websites.
