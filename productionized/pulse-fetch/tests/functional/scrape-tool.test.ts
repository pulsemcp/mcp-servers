import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { scrapeTool } from '../../shared/src/tools/scrape.js';
import {
  createMockScrapingClients,
  type MockNativeFetcher,
  type MockFirecrawlClient,
  type MockBrightDataClient,
} from '../mocks/scraping-clients.functional-mock.js';
import type { IScrapingClients } from '../../shared/src/server.js';
import type { IStrategyConfigClient } from '../../shared/src/strategy-config/index.js';
import { ResourceStorageFactory } from '../../shared/src/storage/index.js';

describe('Scrape Tool', () => {
  let mockServer: Server;
  let mockClients: IScrapingClients;
  let mockNative: MockNativeFetcher;
  let mockFirecrawl: MockFirecrawlClient;
  let mockBrightData: MockBrightDataClient;
  let mockStrategyConfigClient: IStrategyConfigClient;

  beforeEach(() => {
    // Reset storage factory to ensure test isolation
    ResourceStorageFactory.reset();

    // Create a minimal mock server
    mockServer = {} as Server;

    // Create mock clients
    const { clients, mocks } = createMockScrapingClients();
    mockClients = clients;
    mockNative = mocks.native;
    mockFirecrawl = mocks.firecrawl;
    mockBrightData = mocks.brightData;

    // Create mock strategy config client
    mockStrategyConfigClient = {
      loadConfig: vi.fn().mockResolvedValue([]),
      saveConfig: vi.fn().mockResolvedValue(undefined),
      upsertEntry: vi.fn().mockResolvedValue(undefined),
      getStrategyForUrl: vi.fn().mockResolvedValue(null), // No configured strategy by default
    };
  });

  describe('scrape tool', () => {
    it('should use native fetcher when successful', async () => {
      // Set up mock for successful native fetch
      mockNative.setMockResponse({
        success: true,
        status: 200,
        data: 'Native content success',
      });

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com',
        saveResult: false,
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

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com',
        saveResult: false,
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

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com',
        saveResult: false,
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

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com',
        saveResult: false,
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

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com',
        maxChars: 100,
      });

      expect(result.content[0].text).toContain('[Content truncated at 100 characters');
    });

    it('should validate input schema', async () => {
      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );

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
      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );

      const result = await tool.handler({
        // Missing url parameter
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Invalid arguments'),
          },
        ],
        isError: true,
      });
    });

    it('should save resource when saveResource is true', async () => {
      // Set up mock for successful native scrape
      mockNative.setMockResponse({
        success: true,
        status: 200,
        data: 'Content to be saved as resource',
      });

      const tool = scrapeTool(
        mockServer,
        () => mockClients,
        () => mockStrategyConfigClient
      );
      const result = await tool.handler({
        url: 'https://example.com/save-resource-test-' + Date.now(),
        saveResult: true, // Explicitly enable resource saving
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Content to be saved as resource'),
          },
          {
            type: 'resource_link',
            uri: expect.stringMatching(/^memory:\/\/cleaned\/example\.com_save-resource-test-.*$/),
            name: expect.stringMatching(/^https:\/\/example\.com\/save-resource-test-.*$/),
            mimeType: 'text/html',
            description: expect.stringMatching(
              /^Scraped content from https:\/\/example\.com\/save-resource-test-.*/
            ),
          },
        ],
      });
    });

    describe('caching behavior', () => {
      it('should use cached content on second request for same URL', async () => {
        const testUrl = 'https://example.com/cached-test';
        const firstContent = 'First scrape content';
        const secondContent = 'Second scrape content';

        // First request - fresh scrape
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: firstContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const firstResult = await tool.handler({
          url: testUrl,
          saveResult: true,
        });

        expect(firstResult.content[0].text).toContain(firstContent);
        expect(firstResult.content[0].text).toContain('Scraped using: native');

        // Change the mock response to verify we're getting cached content
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: secondContent,
        });

        // Second request - should use cache
        const secondResult = await tool.handler({
          url: testUrl,
          saveResult: true,
        });

        // Should get the first content from cache, not the second
        expect(secondResult.content[0].text).toContain(firstContent);
        expect(secondResult.content[0].text).not.toContain(secondContent);
        expect(secondResult.content[0].text).toContain('Served from cache');
        expect(secondResult.content[0].text).toContain('Cached at:');
      });

      it('should use most recent cached resource when multiple exist', async () => {
        const testUrl = 'https://example.com/multi-cache-test';

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Create multiple cached resources
        for (let i = 1; i <= 3; i++) {
          mockNative.setMockResponse({
            success: true,
            status: 200,
            data: `Content version ${i}`,
          });

          await tool.handler({
            url: testUrl,
            saveResult: true,
            forceRescrape: true, // Force fresh scrape for each
          });

          // Small delay to ensure different timestamps
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Request without force should get the latest (version 3)
        const cachedResult = await tool.handler({
          url: testUrl,
        });

        expect(cachedResult.content[0].text).toContain('Content version 3');
        expect(cachedResult.content[0].text).toContain('Served from cache');
      });

      it('should force fresh scrape when forceRescrape is true', async () => {
        const testUrl = 'https://example.com/force-rescrape-test';

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // First request - create cache
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Original content',
        });

        await tool.handler({
          url: testUrl,
          saveResult: true,
        });

        // Change content for fresh scrape
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Updated content',
        });

        // Request with forceRescrape should get fresh content
        const freshResult = await tool.handler({
          url: testUrl,
          forceRescrape: true,
        });

        expect(freshResult.content[0].text).toContain('Updated content');
        expect(freshResult.content[0].text).not.toContain('Original content');
        expect(freshResult.content[0].text).toContain('Scraped using: native');
        expect(freshResult.content[0].text).not.toContain('Served from cache');
      });

      it('should handle cache lookup failure gracefully', async () => {
        const testUrl = 'https://example.com/cache-failure-test';

        // Mock storage factory to throw an error
        vi.doMock('../../shared/src/storage/index.js', () => ({
          ResourceStorageFactory: {
            create: vi
              .fn()
              .mockRejectedValueOnce(new Error('Storage error'))
              .mockResolvedValue({
                findByUrl: vi.fn().mockResolvedValue([]),
                write: vi.fn().mockResolvedValue('memory://test'),
              }),
          },
        }));

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Fresh content after cache failure',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: testUrl,
        });

        // Should proceed with fresh scrape despite cache error
        expect(result.content[0].text).toContain('Fresh content after cache failure');
        expect(result.content[0].text).toContain('Scraped using: native');
      });

      it('should apply pagination to cached content', async () => {
        const testUrl = 'https://example.com/paginated-cache-test';
        const longContent = 'A'.repeat(500);

        // Create cached content
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: longContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        await tool.handler({
          url: testUrl,
          saveResult: true,
        });

        // Request cached content with pagination
        const paginatedResult = await tool.handler({
          url: testUrl,
          startIndex: 100,
          maxChars: 50,
        });

        expect(paginatedResult.content[0].text).toContain('Served from cache');
        expect(paginatedResult.content[0].text).toContain('[Content truncated at 50 characters');
        expect(paginatedResult.content[0].text).toContain('continue reading from character 150');
      });
    });
  });
});
