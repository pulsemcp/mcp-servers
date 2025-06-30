import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { scrapeTool } from '../../shared/src/tools/scrape.js';
import {
  NativeFetcher,
  FirecrawlClient,
  BrightDataClient,
  type IScrapingClients,
} from '../../shared/src/server.js';
import { FilesystemStrategyConfigClient } from '../../shared/src/strategy-config/index.js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file if it exists
config({ path: path.join(process.cwd(), '.env') });

describe('Scrape Tool Strategy System', () => {
  it('should scrape Yelp page with automatic strategy fallback', async () => {
    console.log('\n🔍 Testing scrape tool with Yelp URL that requires BrightData...\n');

    // Create real clients
    const clients: IScrapingClients = {
      native: new NativeFetcher(),
      firecrawl: process.env.FIRECRAWL_API_KEY
        ? new FirecrawlClient(process.env.FIRECRAWL_API_KEY)
        : undefined,
      brightData: process.env.BRIGHTDATA_BEARER_TOKEN
        ? new BrightDataClient(process.env.BRIGHTDATA_BEARER_TOKEN)
        : undefined,
    };

    // Create strategy config client
    const configClient = new FilesystemStrategyConfigClient({
      configPath: './test-scraping-strategies.md',
    });

    // Create mock server
    const mockServer = {} as Server;

    // Create the scrape tool
    const tool = scrapeTool(
      mockServer,
      () => clients,
      () => configClient
    );

    console.log('📋 Available scraping methods:');
    console.log(`  - Native: ✅`);
    console.log(`  - Firecrawl: ${clients.firecrawl ? '✅' : '❌ (no API key)'}`);
    console.log(`  - BrightData: ${clients.brightData ? '✅' : '❌ (no bearer token)'}`);
    console.log('');

    if (!clients.brightData) {
      console.log('⚠️  WARNING: BrightData is not configured. This test is designed to test');
      console.log('   fallback to BrightData for Yelp pages. The test will likely fail.');
      console.log('');
      console.log('   To run this test properly, set BRIGHTDATA_BEARER_TOKEN in your environment.');
      console.log('');
    }

    // Test URL that typically requires BrightData
    const testUrl = 'https://www.yelp.com/biz/dolly-san-francisco';

    console.log(`🌐 Testing URL: ${testUrl}`);
    console.log('⏳ This may take a moment as it tries different strategies...\n');

    try {
      const startTime = Date.now();

      const result = await tool.handler({
        url: testUrl,
        onlyMainContent: true,
        maxChars: 5000, // Limit output for testing
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️  Completed in ${(duration / 1000).toFixed(2)}s\n`);

      if (result.isError) {
        console.error('❌ Scraping failed:', result.content[0].text);
        throw new Error('Scraping failed');
      }

      const content = result.content[0].text;

      // Extract which strategy was used
      const strategyMatch = content.match(/Scraped using: (\w+)/);
      const strategy = strategyMatch ? strategyMatch[1] : 'unknown';

      console.log(`✅ Successfully scraped using: ${strategy.toUpperCase()}`);
      console.log('');

      // Show a preview of the content
      console.log('📄 Content preview:');
      console.log('─'.repeat(60));
      const preview = content.substring(0, 500).replace(/\n\n+/g, '\n');
      console.log(preview);
      if (content.length > 500) {
        console.log('\n... (truncated)');
      }
      console.log('─'.repeat(60));
      console.log('');

      // Verify content includes expected Yelp elements
      const hasRestaurantName = content.toLowerCase().includes('dolly');
      const hasLocation = content.toLowerCase().includes('san francisco');

      console.log('🔍 Content validation:');
      console.log(`  - Contains restaurant name: ${hasRestaurantName ? '✅' : '❌'}`);
      console.log(`  - Contains location: ${hasLocation ? '✅' : '❌'}`);
      console.log('');

      // Check strategy configuration
      console.log('📋 Checking strategy configuration...');
      const savedStrategy = await configClient.getStrategyForUrl(testUrl);
      if (savedStrategy) {
        console.log(`  - Saved strategy for yelp.com: ${savedStrategy}`);
      } else {
        console.log('  - No saved strategy yet (will be saved after successful scrape)');
      }

      // Load and display current configuration
      const config = await configClient.loadConfig();
      if (config.length > 0) {
        console.log('\n📊 Current strategy configuration:');
        console.log('┌─────────────────────────┬──────────────────┬─────────────────────────┐');
        console.log('│ Prefix                  │ Default Strategy │ Notes                   │');
        console.log('├─────────────────────────┼──────────────────┼─────────────────────────┤');
        config.forEach((entry) => {
          const prefix = entry.prefix.padEnd(23);
          const strategy = entry.default_strategy.padEnd(16);
          const notes = (entry.notes || '').substring(0, 23).padEnd(23);
          console.log(`│ ${prefix} │ ${strategy} │ ${notes} │`);
        });
        console.log('└─────────────────────────┴──────────────────┴─────────────────────────┘');
      }

      // Final assertions
      expect(result.isError).toBeFalsy();
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(100);

      // For Yelp, we expect it to use BrightData when available
      if (clients.brightData) {
        expect(strategy).toBe('brightdata');
        console.log(
          '\n✅ Test passed! Yelp page was successfully scraped using BrightData as expected.'
        );
      } else {
        console.log(
          '\n⚠️  Note: BrightData not available. The test demonstrates the strategy system,'
        );
        console.log('   but Yelp typically requires BrightData for reliable scraping.');
        console.log('   Current result used:', strategy.toUpperCase());
      }
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      throw error;
    } finally {
      // Clean up test config file
      try {
        const fs = await import('fs/promises');
        await fs.unlink('./test-scraping-strategies.md').catch(() => {});
        console.log('\n🧹 Cleaned up test configuration file');
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});
