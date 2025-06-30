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
import { promises as fs } from 'fs';

// Load environment variables from .env file if it exists
config({ path: path.join(process.cwd(), '.env') });

describe('Scrape Tool Basic Strategy Test', () => {
  it('should scrape a simple page and save strategy configuration', async () => {
    console.log('\n🔍 Testing scrape tool with automatic strategy selection...\n');

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

    // Create strategy config client with test file
    const testConfigPath = './test-scraping-strategies.md';
    const configClient = new FilesystemStrategyConfigClient({
      configPath: testConfigPath,
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

    // Test with a simple URL that should work with native fetch
    const testUrl = 'https://example.com';

    console.log(`🌐 Testing URL: ${testUrl}`);
    console.log('⏳ Scraping content...\n');

    try {
      const startTime = Date.now();

      // First scrape - should auto-discover strategy
      const result1 = await tool.handler({
        url: testUrl,
        onlyMainContent: true,
        maxChars: 1000,
      });

      const duration1 = Date.now() - startTime;
      console.log(`⏱️  First scrape completed in ${(duration1 / 1000).toFixed(2)}s\n`);

      if (result1.isError) {
        console.error('❌ First scraping failed:', result1.content[0].text);
        throw new Error('First scraping failed');
      }

      const content1 = result1.content[0].text;

      // Extract which strategy was used
      const strategyMatch1 = content1.match(/Scraped using: (\w+)/);
      const strategy1 = strategyMatch1 ? strategyMatch1[1] : 'unknown';

      console.log(`✅ First scrape successful using: ${strategy1.toUpperCase()}`);

      // Show a preview of the content
      console.log('📄 Content preview:');
      console.log('─'.repeat(60));
      const preview = content1.substring(0, 300).replace(/\n\n+/g, '\n');
      console.log(preview);
      console.log('... (truncated)');
      console.log('─'.repeat(60));
      console.log('');

      // Check if strategy was saved
      console.log('📋 Checking saved configuration...');
      const savedStrategy = await configClient.getStrategyForUrl(testUrl);
      console.log(`  - Saved strategy for example.com: ${savedStrategy || 'none'}`);

      // Load and display configuration
      const config = await configClient.loadConfig();
      if (config.length > 0) {
        console.log('\n📊 Current strategy configuration:');
        config.forEach((entry) => {
          console.log(
            `  - ${entry.prefix}: ${entry.default_strategy} ${entry.notes ? `(${entry.notes})` : ''}`
          );
        });
      }

      // Second scrape - should use saved strategy
      console.log('\n🔄 Testing second scrape (should use saved strategy)...');
      const startTime2 = Date.now();

      const result2 = await tool.handler({
        url: testUrl,
        onlyMainContent: true,
        maxChars: 1000,
      });

      const duration2 = Date.now() - startTime2;
      console.log(`⏱️  Second scrape completed in ${(duration2 / 1000).toFixed(2)}s\n`);

      if (result2.isError) {
        console.error('❌ Second scraping failed:', result2.content[0].text);
        throw new Error('Second scraping failed');
      }

      const content2 = result2.content[0].text;
      const strategyMatch2 = content2.match(/Scraped using: (\w+)/);
      const strategy2 = strategyMatch2 ? strategyMatch2[1] : 'unknown';

      console.log(`✅ Second scrape successful using: ${strategy2.toUpperCase()}`);

      // Verify both scrapes used the same strategy
      if (strategy1 === strategy2) {
        console.log('✅ Strategy consistency verified - both scrapes used the same method');
      } else {
        console.log(`⚠️  Warning: Strategies differ (${strategy1} vs ${strategy2})`);
      }

      // Test with a different domain
      console.log('\n🌐 Testing different domain: https://httpbin.org/html');
      const testUrl2 = 'https://httpbin.org/html';

      const result3 = await tool.handler({
        url: testUrl2,
        onlyMainContent: true,
        maxChars: 1000,
      });

      if (!result3.isError) {
        const content3 = result3.content[0].text;
        const strategyMatch3 = content3.match(/Scraped using: (\w+)/);
        const strategy3 = strategyMatch3 ? strategyMatch3[1] : 'unknown';
        console.log(`✅ httpbin.org scraped successfully using: ${strategy3.toUpperCase()}`);
      }

      // Display final configuration
      console.log('\n📊 Final strategy configuration:');
      const finalConfig = await configClient.loadConfig();
      if (finalConfig.length > 0) {
        console.log(
          '┌─────────────────────────┬──────────────────┬─────────────────────────────────┐'
        );
        console.log(
          '│ Prefix                  │ Default Strategy │ Notes                           │'
        );
        console.log(
          '├─────────────────────────┼──────────────────┼─────────────────────────────────┤'
        );
        finalConfig.forEach((entry) => {
          const prefix = entry.prefix.padEnd(23);
          const strategy = entry.default_strategy.padEnd(16);
          const notes = (entry.notes || '').substring(0, 31).padEnd(31);
          console.log(`│ ${prefix} │ ${strategy} │ ${notes} │`);
        });
        console.log(
          '└─────────────────────────┴──────────────────┴─────────────────────────────────┘'
        );
      }

      // Verify configuration file was created
      const configExists = await fs
        .access(testConfigPath)
        .then(() => true)
        .catch(() => false);
      console.log(`\n✅ Configuration file created: ${configExists}`);

      // Final assertions
      expect(result1.isError).toBeFalsy();
      expect(content1).toBeTruthy();
      expect(savedStrategy).toBeTruthy();
      expect(configExists).toBeTruthy();

      console.log('\n✅ All tests passed! Strategy system is working correctly.');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      throw error;
    } finally {
      // Clean up test config file
      try {
        await fs.unlink(testConfigPath).catch(() => {});
        console.log('\n🧹 Cleaned up test configuration file');
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});
