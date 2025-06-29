import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { scrapeTool } from '../../shared/src/tools/scrape.js';
import {
  createMockScrapingClients,
  type MockNativeFetcher,
  type MockFirecrawlClient,
  type MockBrightDataClient,
} from '../mocks/scraping-clients.functional-mock.js';
import type { IScrapingClients } from '../../shared/src/server.js';

describe('Scrape Tool', () => {
  let mockServer: Server;
  let mockClients: IScrapingClients;
  let mockNative: MockNativeFetcher;
  let mockFirecrawl: MockFirecrawlClient;
  let mockBrightData: MockBrightDataClient;

  beforeEach(() => {
    // Create a minimal mock server
    mockServer = {} as Server;

    // Create mock clients
    const { clients, mocks } = createMockScrapingClients();
    mockClients = clients;
    mockNative = mocks.native;
    mockFirecrawl = mocks.firecrawl;
    mockBrightData = mocks.brightData;
  });

  describe('scrape tool', () => {
    it('should use native fetcher when successful', async () => {
      // Set up mock for successful native fetch
      mockNative.setMockResponse({
        success: true,
        status: 200,
        data: 'Native content success',
      });

      const tool = scrapeTool(mockServer, () => mockClients);
      const result = await tool.handler({
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Native content success'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: native');
    });

    it('should fallback to Firecrawl when native fails', async () => {
      // Set up mocks for native failure and Firecrawl success
      mockNative.setMockResponse({
        success: false,
        status: 500,
        error: 'Network error',
      });

      mockFirecrawl.setMockResponse({
        success: true,
        data: {
          content: 'Firecrawl content success',
          markdown: 'Firecrawl content success',
          html: '<p>Firecrawl content success</p>',
          metadata: {},
        },
      });

      const tool = scrapeTool(mockServer, () => mockClients);
      const result = await tool.handler({
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Firecrawl content success'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: firecrawl');
    });

    it('should fallback to BrightData when native and Firecrawl fail', async () => {
      // Set up mocks for native and Firecrawl failure, BrightData success
      mockNative.setMockResponse({
        success: false,
        status: 500,
        error: 'Network error',
      });

      mockFirecrawl.setMockResponse({
        success: false,
        error: 'Firecrawl failed',
      });

      mockBrightData.setMockResponse({
        success: true,
        data: 'BrightData content success',
      });

      const tool = scrapeTool(mockServer, () => mockClients);
      const result = await tool.handler({
        url: 'https://example.com',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('BrightData content success'),
          },
        ],
      });
      expect(result.content[0].text).toContain('Scraped using: brightdata');
    });

    it('should return error when all methods fail', async () => {
      // Set up mocks for all failures
      mockNative.setMockResponse({
        success: false,
        status: 500,
        error: 'Network error',
      });

      mockFirecrawl.setMockResponse({
        success: false,
        error: 'Firecrawl failed',
      });

      mockBrightData.setMockResponse({
        success: false,
        error: 'BrightData failed',
      });

      const tool = scrapeTool(mockServer, () => mockClients);
      const result = await tool.handler({
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

    it('should handle maxChars truncation', async () => {
      const longContent = 'A'.repeat(1000);

      mockNative.setMockResponse({
        success: true,
        status: 200,
        data: longContent,
      });

      const tool = scrapeTool(mockServer, () => mockClients);
      const result = await tool.handler({
        url: 'https://example.com',
        maxChars: 100,
      });

      expect(result.content[0].text).toContain('[Content truncated at 100 characters');
    });

    it('should validate input schema', async () => {
      const tool = scrapeTool(mockServer, () => mockClients);

      // The tool's inputSchema should be defined
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
          },
        },
        required: ['url'],
      });
    });

    it('should require url parameter', async () => {
      const tool = scrapeTool(mockServer, () => mockClients);

      const result = await tool.handler({
        // Missing url parameter
      });

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
  });
});
