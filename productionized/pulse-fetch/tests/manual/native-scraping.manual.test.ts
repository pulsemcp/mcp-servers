/**
 * Manual test for native scraping client
 *
 * One-liner command (run from pulse-fetch directory):
 * node --import tsx tests/manual/native-scraping.manual.test.ts https://example.com
 */

import 'dotenv/config';
import { NativeScrapingClient } from '../../shared/src/scraping-client/native-scrape-client.js';

async function testNativeScrapingClient(url: string) {
  console.log(`🔍 Testing Native Scraping Client for: ${url}`);
  console.log('='.repeat(60));

  const client = new NativeScrapingClient();

  try {
    const result = await client.scrape(url, {
      timeout: 10000,
    });

    if (!result.success) {
      console.log(`❌ Native scraping failed: ${result.error}`);
      console.log(`📈 Status Code: ${result.statusCode || 'unknown'}`);
      return;
    }

    console.log(`✅ Native scraping successful`);
    console.log(`📈 Status Code: ${result.statusCode}`);
    console.log(`📊 Content-Type: ${result.contentType || 'unknown'}`);
    console.log(`📏 Content-Length: ${result.contentLength || 'unknown'}`);
    console.log(`📝 Data length: ${result.data?.length || 0} characters`);

    if (result.data) {
      // Show first 500 characters
      console.log('\n📖 Content preview:');
      console.log('-'.repeat(40));
      console.log(result.data.slice(0, 500) + (result.data.length > 500 ? '...' : ''));
      console.log('-'.repeat(40));

      // Basic content analysis
      const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(result.data);
      const hasJavaScript = /<script[^>]*>/i.test(result.data);
      const hasStructuredContent = /<(article|main|section|div)[^>]*>/i.test(result.data);

      console.log('\n🔍 Content analysis:');
      console.log(`  - Has title tag: ${hasTitle ? '✅' : '❌'}`);
      console.log(`  - Has JavaScript: ${hasJavaScript ? '✅' : '❌'}`);
      console.log(`  - Has structured content: ${hasStructuredContent ? '✅' : '❌'}`);
    }

    // Show response headers
    if (result.headers && Object.keys(result.headers).length > 0) {
      console.log('\n📋 Response headers:');
      Object.entries(result.headers)
        .slice(0, 5)
        .forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      if (Object.keys(result.headers).length > 5) {
        console.log(`  ... and ${Object.keys(result.headers).length - 5} more headers`);
      }
    }
  } catch (error) {
    console.log(
      `❌ Native scraping client error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node --import tsx tests/manual/native-scraping.manual.test.ts <url>');
    console.log(
      'Example: node --import tsx tests/manual/native-scraping.manual.test.ts https://pulsemcp.com'
    );
    console.log('\nRun from the pulse-fetch directory:');
    console.log(
      'cd productionized/pulse-fetch && node --import tsx tests/manual/native-scraping.manual.test.ts <url>'
    );
    process.exit(1);
  }

  testNativeScrapingClient(url).catch(console.error);
}

export { testNativeScrapingClient };
