import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Firecrawl Scraping via MCP', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('Manual tests require FIRECRAWL_API_KEY environment variable');
    }

    console.log(`Using FIRECRAWL_API_KEY: ${apiKey.substring(0, 10)}...`);

    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        FIRECRAWL_API_KEY: apiKey,
        OPTIMIZE_FOR: 'speed',
      },
      debug: false,
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.disconnect();
  });

  it('should scrape and convert to markdown', async () => {
    const url = 'https://example.com';

    console.log(`Testing Firecrawl Scraping for: ${url}`);
    console.log('============================================================');

    const result = await client.callTool('scrape', {
      url,
      timeout: 30000,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const text = (result.content[0] as { text: string }).text;
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Example Domain');

    console.log('Firecrawl scraping successful');
    console.log(`Content length: ${text.length} characters`);

    // Show content preview
    console.log('\nContent preview:');
    console.log('----------------------------------------');
    console.log(text.slice(0, 200) + '...');
    console.log('----------------------------------------');
  }, 60000);
});
