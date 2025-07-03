import { describe, it, expect } from 'vitest';
import { scrapeTool } from '../../../shared/src/tools/scrape.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type {
  ClientFactory,
  StrategyConfigFactory,
  IScrapingClients,
} from '../../../shared/src/server.js';
import { NativeFetcher, FirecrawlClient, BrightDataClient } from '../../../shared/src/server.js';
import { FilesystemStrategyConfigClient } from '../../../shared/src/strategy-config/index.js';

describe('Scrape Tool', () => {
  const createMockServer = () =>
    new Server({
      name: 'test-server',
      version: '1.0.0',
    });

  const createClientFactory = (): ClientFactory => {
    return () => {
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      const brightDataToken = process.env.BRIGHTDATA_API_KEY;

      const clients: IScrapingClients = {
        native: new NativeFetcher(),
      };

      if (firecrawlApiKey) {
        clients.firecrawl = new FirecrawlClient(firecrawlApiKey);
      }

      if (brightDataToken) {
        clients.brightData = new BrightDataClient(brightDataToken);
      }

      return clients;
    };
  };

  const strategyConfigFactory: StrategyConfigFactory = () => new FilesystemStrategyConfigClient();

  it('should scrape a simple page with automatic strategy selection', async () => {
    const server = createMockServer();
    const clientFactory = createClientFactory();
    const tool = scrapeTool(server, clientFactory, strategyConfigFactory);

    const result = await tool.handler({
      url: 'https://example.com',
      resultHandling: 'returnOnly',
      timeout: 10000,
    });

    expect('isError' in result ? result.isError : undefined).toBeUndefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0]?.text).toContain('Example Domain');

    console.log('✅ Scrape tool successful');
    console.log(`📝 Content length: ${result.content[0]?.text?.length || 0} characters`);
  });

  it('should handle errors gracefully', async () => {
    const server = createMockServer();
    const clientFactory = createClientFactory();
    const tool = scrapeTool(server, clientFactory, strategyConfigFactory);

    const result = await tool.handler({
      url: 'https://httpstat.us/500',
      resultHandling: 'returnOnly',
      timeout: 10000,
      forceRescrape: true,
    });

    expect('isError' in result ? result.isError : false).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content[0]?.text).toContain('Failed to scrape');

    console.log('✅ Error handling working correctly');
  }, 60000); // Increase test timeout to 60 seconds

  it('should support content extraction when LLM is configured', async () => {
    const hasLLM = process.env.LLM_PROVIDER && process.env.LLM_API_KEY;
    if (!hasLLM) {
      console.log('⚠️  Skipping extraction test - LLM not configured');
      return;
    }

    const server = createMockServer();
    const clientFactory = createClientFactory();
    const tool = scrapeTool(server, clientFactory, strategyConfigFactory);

    const result = await tool.handler({
      url: 'https://example.com',
      extract: 'What is the main heading on this page?',
      resultHandling: 'returnOnly',
      timeout: 10000,
      forceRescrape: true,
    });

    expect('isError' in result ? result.isError : false).toBe(false);
    expect(result.content).toBeDefined();
    expect(result.content[0]?.text).toBeDefined();

    console.log('✅ Extraction successful');
    console.log('Response:', result.content[0]?.text?.slice(0, 200) + '...');
  });
});
