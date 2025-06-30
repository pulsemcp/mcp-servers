/**
 * Manual test for Firecrawl scraping client
 *
 * One-liner command (run from pulse-fetch directory):
 * node --import tsx tests/manual/firecrawl-scraping.manual.test.ts https://example.com
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FirecrawlScrapingClient } from '../../shared/src/scraping-client/firecrawl-scrape-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to save scraped results to temporary file
function saveScrapedResult(url: string, data: unknown, clientName: string): string {
  const tempDir = join(__dirname, 'temp-results');
  mkdirSync(tempDir, { recursive: true });

  const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${clientName}_${sanitizedUrl}_${timestamp}.json`;
  const filepath = join(tempDir, filename);

  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return filepath;
}

async function testFirecrawlScrapingClient(url: string) {
  console.log(`🔥 Testing Firecrawl Scraping Client for: ${url}`);
  console.log('='.repeat(60));

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.log('❌ FIRECRAWL_API_KEY not found in environment variables');
    console.log('   Please set FIRECRAWL_API_KEY in your .env file');
    return;
  }

  console.log(`🔑 Using API key: ${apiKey.slice(0, 10)}...`);

  const client = new FirecrawlScrapingClient(apiKey);

  try {
    const result = await client.scrape(url, {
      onlyMainContent: true,
      formats: ['markdown', 'html'],
    });

    if (!result.success) {
      console.log(`❌ Firecrawl scraping failed: ${result.error}`);
      return;
    }

    if (!result.data) {
      console.log('❌ Firecrawl returned no data');
      return;
    }

    console.log('✅ Firecrawl scraping successful');

    // Save scraped result to temporary file
    const savedPath = saveScrapedResult(url, result.data, 'firecrawl');
    console.log(`💾 Full scraped content saved to: ${savedPath}`);

    // Show content lengths
    console.log(`📝 Markdown length: ${result.data.markdown?.length || 0} characters`);
    console.log(`📝 HTML length: ${result.data.html?.length || 0} characters`);
    console.log(`📝 Raw content length: ${result.data.content?.length || 0} characters`);
    console.log(`📊 Metadata keys: ${Object.keys(result.data.metadata || {}).join(', ')}`);

    // Show markdown preview
    if (result.data.markdown) {
      console.log('\n📖 Markdown preview:');
      console.log('-'.repeat(40));
      console.log(
        result.data.markdown.slice(0, 500) + (result.data.markdown.length > 500 ? '...' : '')
      );
      console.log('-'.repeat(40));
    }

    // Show key metadata
    if (result.data.metadata && Object.keys(result.data.metadata).length > 0) {
      console.log('\n🏷️  Key Metadata:');
      const keyFields = ['title', 'description', 'statusCode', 'contentType', 'creditsUsed'];
      keyFields.forEach((field) => {
        if (result.data!.metadata[field] !== undefined) {
          console.log(`  - ${field}: ${result.data!.metadata[field]}`);
        }
      });

      const totalKeys = Object.keys(result.data.metadata).length;
      const shownKeys = keyFields.filter(
        (field) => result.data!.metadata[field] !== undefined
      ).length;
      if (totalKeys > shownKeys) {
        console.log(`  ... and ${totalKeys - shownKeys} more metadata fields`);
      }
    }
  } catch (error) {
    console.log(
      `❌ Firecrawl scraping client error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node --import tsx tests/manual/firecrawl-scraping.manual.test.ts <url>');
    console.log(
      'Example: node --import tsx tests/manual/firecrawl-scraping.manual.test.ts https://espn.com'
    );
    console.log('\nRun from the pulse-fetch directory:');
    console.log(
      'cd productionized/pulse-fetch && node --import tsx tests/manual/firecrawl-scraping.manual.test.ts <url>'
    );
    process.exit(1);
  }

  testFirecrawlScrapingClient(url).catch(console.error);
}

export { testFirecrawlScrapingClient };
