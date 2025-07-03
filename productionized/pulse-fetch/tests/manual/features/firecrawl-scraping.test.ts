import { describe, it, expect } from 'vitest';
import { FirecrawlScrapingClient } from '../../../shared/src/scraping-client/firecrawl-scrape-client.js';

describe('Firecrawl Scraping Client', () => {
  it('should scrape and convert to markdown', async () => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.log('⚠️  Skipping Firecrawl test - FIRECRAWL_API_KEY not set');
      return;
    }

    const client = new FirecrawlScrapingClient(apiKey);
    const url = 'https://example.com';

    console.log(`🔥 Testing Firecrawl Scraping Client for: ${url}`);
    console.log('============================================================');
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

    const result = await client.scrape(url);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.markdown).toBeDefined();
    expect(result.data?.metadata).toBeDefined();

    console.log(`✅ Firecrawl scraping successful`);
    console.log(`📝 Markdown length: ${result.data!.markdown.length} characters`);
    console.log(`📝 HTML length: ${result.data!.html.length} characters`);
    console.log(`📊 Metadata keys: ${Object.keys(result.data!.metadata).join(', ')}`);

    // Show markdown preview
    console.log('\n📖 Markdown preview:');
    console.log('----------------------------------------');
    console.log(result.data!.markdown.slice(0, 200) + '...');
    console.log('----------------------------------------');

    // Check metadata
    expect(result.data!.metadata.title).toBeDefined();
    expect(result.data!.metadata.statusCode).toBe(200);
  });
});
