import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Use override: true to ensure .env values take precedence over any
// pre-existing environment variables set by the shell/orchestrator
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Extract text from MCP content item (handles both resource and text types) */
function getContentText(content: {
  type: string;
  resource?: { text: string };
  text?: string;
}): string {
  return content.type === 'resource' ? content.resource!.text : content.text!;
}

describe('BrightData Scraping via MCP', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    if (!apiKey) {
      throw new Error('Manual tests require BRIGHTDATA_API_KEY environment variable');
    }

    console.log(`Using BRIGHTDATA_API_KEY: ${apiKey.substring(0, 20)}...`);

    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        BRIGHTDATA_API_KEY: apiKey,
        OPTIMIZE_FOR: 'speed',
      },
      debug: false,
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.disconnect();
  });

  it('should scrape a simple page', async () => {
    const url = 'https://example.com';

    console.log(`Testing BrightData Scraping for: ${url}`);
    console.log('============================================================');

    const result = await client.callTool('scrape', {
      url,
      timeout: 30000,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);

    console.log('BrightData scraping successful');
    console.log(`Content length: ${text.length} characters`);

    // Content analysis
    console.log('\nContent analysis:');
    console.log(`  - Contains "Example Domain": ${text.includes('Example Domain')}`);
  }, 60000);
});
