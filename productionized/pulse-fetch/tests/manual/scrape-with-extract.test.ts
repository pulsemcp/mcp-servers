import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { scrapeTool } from '../../shared/src/tools/scrape.js';
import type { IScrapingClients } from '../../shared/src/server.js';
import { NativeScrapingClient } from '../../shared/src/scraping-client/native-scrape-client.js';
import { FilesystemStrategyConfigClient } from '../../shared/src/strategy-config/filesystem-strategy-config-client.js';

/**
 * Manual test for scrape tool with extraction
 *
 * Run with environment variables:
 * LLM_PROVIDER=anthropic LLM_API_KEY=your-key npx tsx tests/manual/scrape-with-extract.test.ts
 *
 * Or for OpenAI:
 * LLM_PROVIDER=openai LLM_API_KEY=your-key npx tsx tests/manual/scrape-with-extract.test.ts
 */

async function testScrapeWithExtract() {
  // Check for LLM configuration
  const provider = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;

  if (!provider || !apiKey) {
    console.error('❌ Please set LLM_PROVIDER and LLM_API_KEY environment variables');
    console.error('\nExample:');
    console.error(
      'LLM_PROVIDER=anthropic LLM_API_KEY=your-key npx tsx tests/manual/scrape-with-extract.test.ts'
    );
    process.exit(1);
  }

  console.log('🔧 Testing Scrape Tool with Extract Feature');
  console.log(`LLM Provider: ${provider}`);
  console.log(`Extract feature available: Yes\n`);

  // Create mock server and clients
  const mockServer = new Server({
    name: 'test-server',
    version: '1.0.0',
  });

  const clientsFactory = (): IScrapingClients => ({
    native: new NativeScrapingClient(),
    firecrawl: null,
    brightData: null,
  });

  const strategyConfigFactory = () => new FilesystemStrategyConfigClient();

  // Create the scrape tool
  const tool = scrapeTool(mockServer, clientsFactory, strategyConfigFactory);

  // Verify extract parameter is included
  console.log('📋 Tool Input Schema Properties:');
  console.log(Object.keys(tool.inputSchema.properties));
  console.log(
    `Extract parameter included: ${'extract' in tool.inputSchema.properties ? '✅' : '❌'}\n`
  );

  // Test cases
  const testCases = [
    {
      name: 'Extract from GitHub Repository',
      url: 'https://github.com/modelcontextprotocol/docs',
      extract: 'What is this project about? Extract the main description and key features.',
    },
    {
      name: 'Extract from News Article',
      url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      extract: 'Extract a brief summary of what AI is and its main applications',
    },
    {
      name: 'Extract Specific Data',
      url: 'https://www.python.org',
      extract: 'What is the latest Python version and when was it released?',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Extract Query: ${testCase.extract}`);
    console.log('---');

    try {
      const startTime = Date.now();
      const result = await tool.handler({
        url: testCase.url,
        extract: testCase.extract,
        saveResult: false, // Don't save for tests
        maxChars: 50000, // Limit content size
      });
      const duration = Date.now() - startTime;

      if (result.isError) {
        console.log(`❌ Error: ${result.content[0].text}`);
      } else {
        console.log(`✅ Success (${duration}ms)`);
        const content = result.content[0].text;
        // Show first 500 chars of extracted content
        const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        console.log('Extracted Content Preview:');
        console.log(preview);
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Test without extraction for comparison
  console.log('\n\n📝 Test: Scrape without extraction (for comparison)');
  const url = 'https://example.com';

  try {
    const startTime = Date.now();
    const result = await tool.handler({
      url,
      saveResult: false,
      maxChars: 1000, // Limit to see the difference
    });
    const duration = Date.now() - startTime;

    if (result.isError) {
      console.log(`❌ Error: ${result.content[0].text}`);
    } else {
      console.log(`✅ Success (${duration}ms)`);
      const content = result.content[0].text;
      console.log('Raw HTML Preview (first 300 chars):');
      console.log(content.substring(0, 300) + '...');
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n✨ Scrape with extract tests completed!');
}

// Run the test
testScrapeWithExtract().catch(console.error);
