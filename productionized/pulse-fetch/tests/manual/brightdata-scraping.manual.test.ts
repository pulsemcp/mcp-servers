/**
 * Manual test for BrightData scraping client
 *
 * One-liner command (run from pulse-fetch directory):
 * node --import tsx tests/manual/brightdata-scraping.manual.test.ts https://example.com
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BrightDataScrapingClient } from '../../shared/src/scraping-client/brightdata-scrape-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to save scraped results to temporary file
function saveScrapedResult(url: string, data: string, clientName: string): string {
  const tempDir = join(__dirname, 'temp-results');
  mkdirSync(tempDir, { recursive: true });

  const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${clientName}_${sanitizedUrl}_${timestamp}.txt`;
  const filepath = join(tempDir, filename);

  writeFileSync(filepath, data, 'utf-8');
  return filepath;
}

async function testBrightDataScrapingClient(url: string) {
  console.log(`🌟 Testing BrightData Scraping Client for: ${url}`);
  console.log('='.repeat(60));

  const bearerToken = process.env.BRIGHTDATA_BEARER_TOKEN;
  if (!bearerToken) {
    console.log('❌ BRIGHTDATA_BEARER_TOKEN not found in environment variables');
    console.log('   Please set BRIGHTDATA_BEARER_TOKEN in your .env file');
    console.log('   Format: <your-token> (Bearer will be added automatically)');
    return;
  }

  console.log(`🔑 Using API key: ${bearerToken.slice(0, 15)}...`);

  const client = new BrightDataScrapingClient(bearerToken);

  try {
    const result = await client.scrape(url, {
      zone: 'mcp_server_unlocker',
      format: 'raw',
    });

    if (!result.success) {
      console.log(`❌ BrightData scraping failed: ${result.error}`);
      return;
    }

    if (!result.data) {
      console.log('❌ BrightData returned no data');
      return;
    }

    console.log('✅ BrightData scraping successful');
    console.log(`📝 Content length: ${result.data.length} characters`);

    // Save scraped result to temporary file
    const savedPath = saveScrapedResult(url, result.data, 'brightdata');
    console.log(`💾 Full scraped content saved to: ${savedPath}`);

    // Show content preview
    console.log('\n📖 Content preview:');
    console.log('-'.repeat(40));
    console.log(result.data.slice(0, 500) + (result.data.length > 500 ? '...' : ''));
    console.log('-'.repeat(40));

    // Basic content analysis
    const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(result.data);
    const hasJavaScript = /<script[^>]*>/i.test(result.data);
    const hasStructuredContent = /<(article|main|section|div)[^>]*>/i.test(result.data);
    const isHtml = result.data.trim().startsWith('<');
    const isJson = result.data.trim().startsWith('{') || result.data.trim().startsWith('[');

    console.log('\n🔍 Content analysis:');
    console.log(`  - Is HTML: ${isHtml ? '✅' : '❌'}`);
    console.log(`  - Is JSON: ${isJson ? '✅' : '❌'}`);
    console.log(`  - Has title tag: ${hasTitle ? '✅' : '❌'}`);
    console.log(`  - Has JavaScript: ${hasJavaScript ? '✅' : '❌'}`);
    console.log(`  - Has structured content: ${hasStructuredContent ? '✅' : '❌'}`);

    // Character distribution analysis
    const totalChars = result.data.length;
    const htmlChars = (result.data.match(/</g) || []).length;
    const textDensity = (((totalChars - htmlChars * 10) / totalChars) * 100).toFixed(1);

    console.log('\n📊 Content statistics:');
    console.log(`  - Total characters: ${totalChars.toLocaleString()}`);
    console.log(`  - HTML tags: ${htmlChars}`);
    console.log(`  - Text density: ${textDensity}%`);
  } catch (error) {
    console.log(
      `❌ BrightData scraping client error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node --import tsx tests/manual/brightdata-scraping.manual.test.ts <url>');
    console.log(
      'Example: node --import tsx tests/manual/brightdata-scraping.manual.test.ts https://yelp.com'
    );
    console.log('\nRun from the pulse-fetch directory:');
    console.log(
      'cd productionized/pulse-fetch && node --import tsx tests/manual/brightdata-scraping.manual.test.ts <url>'
    );
    process.exit(1);
  }

  testBrightDataScrapingClient(url).catch(console.error);
}

export { testBrightDataScrapingClient };
