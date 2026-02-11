import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Native Scraping via MCP', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        SKIP_HEALTH_CHECKS: 'true',
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

    console.log(`Testing Native Scraping for: ${url}`);
    console.log('============================================================');

    const result = await client.callTool('scrape', {
      url,
      timeout: 10000,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    // Scrape returns resource content type with text in resource.text
    const content = result.content[0] as {
      type: string;
      resource?: { text: string };
      text?: string;
    };
    const text = content.type === 'resource' ? content.resource!.text : content.text!;
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Example Domain');

    console.log('Native scraping successful');
    console.log(`Content length: ${text.length} characters`);
  });

  it('should handle errors gracefully', async () => {
    const url = 'https://httpstat.us/500';

    const result = await client.callTool('scrape', {
      url,
      timeout: 10000,
      forceRescrape: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();

    // Error responses use text content type
    const content = result.content[0] as {
      type: string;
      resource?: { text: string };
      text?: string;
    };
    const text = content.type === 'resource' ? content.resource!.text : content.text!;
    expect(text).toContain('Failed to scrape');

    console.log('Error handling working correctly');
  }, 60000);
});
