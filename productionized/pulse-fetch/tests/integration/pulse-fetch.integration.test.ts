import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Pulse Fetch MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Tools', () => {
    it('should execute scrape tool with native success', async () => {
      client = await createTestMCPClientWithMocks({
        nativeSuccess: true,
        nativeData: 'Native scrape success!',
      });

      const result = await client.callTool('scrape', {
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Native scrape success!'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: native');
    });

    it('should fallback to Firecrawl when native fails', async () => {
      client = await createTestMCPClientWithMocks({
        nativeSuccess: false,
        enableFirecrawl: true,
        firecrawlSuccess: true,
        firecrawlData: 'Firecrawl fallback success!',
      });

      const result = await client.callTool('scrape', {
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Firecrawl fallback success!'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: firecrawl');
    });

    it('should fallback to BrightData when others fail', async () => {
      client = await createTestMCPClientWithMocks({
        nativeSuccess: false,
        enableFirecrawl: true,
        firecrawlSuccess: false,
        enableBrightData: true,
        brightDataSuccess: true,
        brightDataData: 'BrightData final fallback success!',
      });

      const result = await client.callTool('scrape', {
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('BrightData final fallback success!'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: brightdata');
    });

    it('should handle complete failure gracefully', async () => {
      client = await createTestMCPClientWithMocks({
        nativeSuccess: false,
        enableFirecrawl: true,
        firecrawlSuccess: false,
        enableBrightData: true,
        brightDataSuccess: false,
      });

      const result = await client.callTool('scrape', {
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Failed to scrape'),
          },
        ],
        isError: true,
      });
    });

    it('should validate required url parameter', async () => {
      client = await createTestMCPClientWithMocks({});

      const result = await client.callTool('scrape', {
        // Missing url parameter
      });

      // Tool should return error response, not throw
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error'),
          },
        ],
        isError: true,
      });
    });

    it('should handle maxChars parameter', async () => {
      const longContent = 'A'.repeat(1000);

      client = await createTestMCPClientWithMocks({
        nativeSuccess: true,
        nativeData: longContent,
      });

      const result = await client.callTool('scrape', {
        url: 'https://example.com',
        maxChars: 100,
      });

      expect(result.content[0].text).toContain('[Content truncated at 100 characters');
    });
  });
});

interface MockConfig {
  nativeSuccess?: boolean;
  nativeData?: string;
  nativeStatus?: number;
  enableFirecrawl?: boolean;
  firecrawlSuccess?: boolean;
  firecrawlData?: string;
  enableBrightData?: boolean;
  brightDataSuccess?: boolean;
  brightDataData?: string;
}

/**
 * Helper function to create a TestMCPClient with mocked scraping clients.
 */
async function createTestMCPClientWithMocks(config: MockConfig): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const env: Record<string, string> = {};

  // Native fetcher mocks
  if (config.nativeSuccess !== undefined) {
    env.MOCK_NATIVE_SUCCESS = config.nativeSuccess.toString();
  }
  if (config.nativeData) {
    env.MOCK_NATIVE_DATA = config.nativeData;
  }
  if (config.nativeStatus) {
    env.MOCK_NATIVE_STATUS = config.nativeStatus.toString();
  }

  // Firecrawl mocks
  if (config.enableFirecrawl) {
    env.ENABLE_FIRECRAWL_MOCK = 'true';
    if (config.firecrawlSuccess !== undefined) {
      env.MOCK_FIRECRAWL_SUCCESS = config.firecrawlSuccess.toString();
    }
    if (config.firecrawlData) {
      env.MOCK_FIRECRAWL_DATA = config.firecrawlData;
    }
  }

  // BrightData mocks
  if (config.enableBrightData) {
    env.ENABLE_BRIGHTDATA_MOCK = 'true';
    if (config.brightDataSuccess !== undefined) {
      env.MOCK_BRIGHTDATA_SUCCESS = config.brightDataSuccess.toString();
    }
    if (config.brightDataData) {
      env.MOCK_BRIGHTDATA_DATA = config.brightDataData;
    }
  }

  const client = new TestMCPClient({
    serverPath,
    env,
    debug: false,
  });

  await client.connect();
  return client;
}
