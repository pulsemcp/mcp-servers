import { describe, it, expect } from 'vitest';
import { NativeScrapingClient } from '../../../shared/src/scraping-client/native-scrape-client.js';

describe('Native Scraping Client', () => {
  it('should scrape a simple page', async () => {
    const client = new NativeScrapingClient();
    const url = 'https://example.com';

    console.log(`🔍 Testing Native Scraping Client for: ${url}`);
    console.log('============================================================');

    const result = await client.scrape(url, { timeout: 10000 });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.statusCode).toBe(200);
    expect(result.contentType).toContain('text/html');

    console.log(`✅ Native scraping successful`);
    console.log(`📈 Status Code: ${result.statusCode}`);
    console.log(`📊 Content-Type: ${result.contentType || 'unknown'}`);
    console.log(`📝 Data length: ${result.data?.length || 0} characters`);

    // Basic content analysis
    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(result.data!);
    const hasStructuredContent = /<(article|main|section|div)[^>]*>/i.test(result.data!);

    console.log('\n🔍 Content analysis:');
    console.log(`  - Has title tag: ${hasTitle ? '✅' : '❌'}`);
    console.log(`  - Has structured content: ${hasStructuredContent ? '✅' : '❌'}`);

    expect(hasTitle).toBe(true);
    expect(hasStructuredContent).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const client = new NativeScrapingClient();
    const url = 'https://invalid-domain-that-does-not-exist-12345.com';

    const result = await client.scrape(url, { timeout: 10000 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Note: statusCode is undefined for network errors
  });
});
