import { describe, it, expect } from 'vitest';
import { BrightDataScrapingClient } from '../../../shared/src/scraping-client/brightdata-scrape-client.js';

describe('BrightData Scraping Client', () => {
  it('should scrape a simple page', async () => {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    if (!apiKey) {
      console.log('⚠️  Skipping BrightData test - BRIGHTDATA_API_KEY not set');
      return;
    }

    const client = new BrightDataScrapingClient(apiKey);
    const url = 'https://example.com';

    console.log(`🌟 Testing BrightData Scraping Client for: ${url}`);
    console.log('============================================================');
    console.log(`🔑 Using API key: ${apiKey.substring(0, 20)}...`);

    const result = await client.scrape(url);

    if (!result.success) {
      // BrightData might fail with 401 if token is invalid
      console.log(`❌ BrightData scraping failed: ${result.error}`);
      // Don't fail the test for auth errors
      if (result.error?.includes('401')) {
        console.log('⚠️  Skipping due to authentication error');
        return;
      }
      expect(result.success).toBe(true);
    }

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBeGreaterThan(0);

    console.log(`✅ BrightData scraping successful`);
    console.log(`📝 Data length: ${result.data!.length} characters`);

    // Basic content analysis
    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(result.data!);
    const hasStructuredContent = /<(article|main|section|div)[^>]*>/i.test(result.data!);

    console.log('\n🔍 Content analysis:');
    console.log(`  - Has title tag: ${hasTitle ? '✅' : '❌'}`);
    console.log(`  - Has structured content: ${hasStructuredContent ? '✅' : '❌'}`);
  });
});
