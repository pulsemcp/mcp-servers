# Contributing

Before starting any work, please open an Issue to discuss the changes you'd like to make; let's make sure we don't duplicate effort.

Please do all your work on a fork of the repository and open a PR against the main branch.

## Running the server locally

```bash
npm install
npm run build
npm run start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key environment variables:

- `FIRECRAWL_API_KEY`: API key for Firecrawl service (optional)
- `BRIGHTDATA_API_KEY`: Token for BrightData Web Unlocker (optional)
- `LLM_PROVIDER`: Provider for extract feature (anthropic/openai/openai-compatible)
- `LLM_API_KEY`: API key for chosen LLM provider
- `LLM_MODEL`: Model to use for extraction
- `MCP_RESOURCE_STORAGE`: Storage backend (memory/filesystem)

## Debugging tools

### Running Inspector

Using local build:

```bash
cd productionized/pulse-fetch
npm install
npm run build
npx @modelcontextprotocol/inspector node local/build/index.js \
  -e FIRECRAWL_API_KEY=<your-firecrawl-api-key> \
  -e BRIGHTDATA_API_KEY=<your-brightdata-token> \
  -e LLM_PROVIDER=<anthropic|openai|openai-compatible> \
  -e LLM_API_KEY=<your-llm-api-key> \
  -e LLM_MODEL=<model-name> \
  -e MCP_RESOURCE_STORAGE=<memory|filesystem> \
  -e MCP_RESOURCE_FILESYSTEM_ROOT=<path-to-storage> \
  -e STRATEGY_CONFIG_PATH=<path-to-strategy-config>
```

Using published package:

```bash
npx @modelcontextprotocol/inspector npx @pulsemcp/pulse-fetch@latest \
  -e FIRECRAWL_API_KEY=<your-firecrawl-api-key> \
  -e BRIGHTDATA_API_KEY=<your-brightdata-token> \
  -e LLM_PROVIDER=<anthropic|openai|openai-compatible> \
  -e LLM_API_KEY=<your-llm-api-key> \
  -e LLM_MODEL=<model-name> \
  -e MCP_RESOURCE_STORAGE=<memory|filesystem> \
  -e MCP_RESOURCE_FILESYSTEM_ROOT=<path-to-storage> \
  -e STRATEGY_CONFIG_PATH=<path-to-strategy-config>
```

### Claude Desktop

#### Follow logs in real-time

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

This project has four types of tests:

1. **Functional Tests** (`npm test`) - Unit tests with mocked dependencies
2. **Integration Tests** (`npm run test:integration`) - Tests the full MCP server
3. **Manual Tests** (`npm run test:manual`) - Tests against real external APIs
4. **Comprehensive Suite** (`node --import tsx tests/manual/comprehensive-suite.manual.test.ts`) - Full client validation

### Manual Testing

Manual tests are critical when modifying scraping clients or any code that interacts with external APIs. They:

- Use real API credentials (not mocked)
- Verify the actual API integration works correctly
- Test response shapes and error handling with real data
- Are NOT run in CI to avoid external dependencies

**When to run manual tests:**

- After modifying any code in `shared/src/clients/`
- When updating scraping strategies or fallback logic
- Before releasing changes that affect external API calls
- When debugging issues that only appear with real API responses

**Running manual tests:**

```bash
# Copy .env.example to .env and add your API keys
cp .env.example .env
# Edit .env to add your real API keys

# Run all manual tests
npm run test:manual

# Run comprehensive client test suite
cd productionized/pulse-fetch
node --import tsx tests/manual/comprehensive-suite.manual.test.ts
```

## Testing with a test.ts file

Helpful for isolating and trying out pieces of code.

1. Create a `src/test.ts` file.
2. Write test code to exercise specific functionality
3. Run with: `npm run build && node build/test.js`

Example test file:

```ts
import * as dotenv from 'dotenv';
import { NativeClient } from './clients/native-client.js';
import { FirecrawlClient } from './clients/firecrawl-client.js';

dotenv.config();

async function test() {
  // Test native scraping
  const native = new NativeClient();
  const result = await native.scrape('https://example.com');
  console.log('Native result:', result);

  // Test Firecrawl if API key is available
  if (process.env.FIRECRAWL_API_KEY) {
    const firecrawl = new FirecrawlClient(process.env.FIRECRAWL_API_KEY);
    const fcResult = await firecrawl.scrape('https://example.com');
    console.log('Firecrawl result:', fcResult);
  }
}

test().catch(console.error);
```

## Publishing

See the main repository's [PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md) for detailed publishing instructions.

Quick summary:

1. Update version: `npm run stage-publish`
2. Update CHANGELOG.md
3. Commit all changes
4. Push and create PR
5. After merge, GitHub Actions will publish automatically

## Development Tips

- Always run linting from the repository root: `npm run lint`
- The server uses a three-tier fallback system for scraping (native → Firecrawl → BrightData)
- Extract feature requires LLM configuration to be available
- Resource storage can be configured between memory and filesystem backends
- Use unique URLs in tests to avoid cache collisions
