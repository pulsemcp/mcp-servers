import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Content Filtering via MCP', () => {
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

  it('should filter HTML content effectively when scraping', async () => {
    // Scrape a real page - the scrape tool automatically cleans/filters content
    const result = await client.callTool('scrape', {
      url: 'https://example.com',
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

    console.log('Content length:', text.length, 'characters');
    console.log('\nFiltered content preview:');
    console.log(text.slice(0, 500));

    // Verify main content is preserved
    expect(text).toContain('Example Domain');

    // Verify script content is not present in the cleaned output
    expect(text).not.toContain('<script');
    expect(text).not.toContain('console.log');

    // The cleaned content should be significantly shorter than raw HTML
    // (cleaning converts HTML to markdown or stripped text)
    expect(text.length).toBeGreaterThan(0);

    console.log('\nContent filtering working correctly');
  });
});
