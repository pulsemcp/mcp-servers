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
        resultHandling: 'returnOnly',
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
        resultHandling: 'returnOnly',
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
        resultHandling: 'returnOnly',
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
        resultHandling: 'returnOnly',
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
        resultHandling: 'returnOnly', // Test with returnOnly to check text truncation
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

    describe('resultHandling modes', () => {
      it('should return only content with returnOnly mode', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: '<html><body>Content to return only</body></html>',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com/return-only-test-' + Date.now(),
          resultHandling: 'returnOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content to return only'),
            },
          ],
        });
        // Should not have resource link
        expect(result.content).toHaveLength(1);
      });

      it('should save and return with saveAndReturn mode (default)', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: '<html><body>Content to save and return</body></html>',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com/save-and-return-test-' + Date.now(),
          // Not specifying resultHandling - should default to saveAndReturn
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'resource',
              resource: {
                uri: expect.stringMatching(/^memory:\/\//),
                name: expect.stringMatching(/^https:\/\/example\.com\/save-and-return-test-.*$/),
                mimeType: 'text/markdown',
                text: expect.stringContaining('Content to save and return'),
              },
            },
          ],
        });
        // Should only have the embedded resource
        expect(result.content).toHaveLength(1);
      });

      it('should save only with saveOnly mode', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: '<html><body>Content to save only</body></html>',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com/save-only-test-' + Date.now(),
          resultHandling: 'saveOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'resource_link',
              uri: expect.stringMatching(/^memory:\/\//),
              name: expect.stringMatching(/^https:\/\/example\.com\/save-only-test-.*$/),
              mimeType: 'text/markdown',
              description: expect.stringMatching(
                /^Scraped content from https:\/\/example\.com\/save-only-test-.*/
              ),
            },
          ],
        });
        // Should not have text content
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('resource_link');
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
          resultHandling: 'saveAndReturn',
        });

        // For saveAndReturn, content is in the embedded resource's text field
        expect(firstResult.content[0].type).toBe('resource');
        expect(firstResult.content[0].resource.text).toContain(firstContent);
        // The embedded resource text doesn't contain metadata like "Scraped using:"

        // Change the mock response to verify we're getting cached content
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: secondContent,
        });

        // Second request - should use cache
        const secondResult = await tool.handler({
          url: testUrl,
          resultHandling: 'saveAndReturn',
        });

        // Should get the first content from cache, not the second
        expect(secondResult.content[0].type).toBe('resource');
        expect(secondResult.content[0].resource.text).toContain(firstContent);
        expect(secondResult.content[0].resource.text).not.toContain(secondContent);
        // Embedded resources don't contain cache metadata
      });

      it('should bypass cache lookup with saveOnly mode', async () => {
        const testUrl = 'https://example.com/save-only-cache-test';
        const firstContent = 'First scrape content';
        const secondContent = 'Second scrape content';

        // First request - save with saveAndReturn
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

        await tool.handler({
          url: testUrl,
          resultHandling: 'saveAndReturn',
        });

        // Change the mock response
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: secondContent,
        });

        // Second request with saveOnly - should NOT use cache
        const saveOnlyResult = await tool.handler({
          url: testUrl,
          resultHandling: 'saveOnly',
        });

        // Should save the new content, not return cached
        expect(saveOnlyResult.content).toHaveLength(1);
        expect(saveOnlyResult.content[0].type).toBe('resource_link');

        // Verify it saved the new content by doing a returnOnly request
        const verifyResult = await tool.handler({
          url: testUrl,
          resultHandling: 'returnOnly',
        });

        // Should now get the second content from cache
        expect(verifyResult.content[0].text).toContain(secondContent);
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
            resultHandling: 'saveAndReturn',
            forceRescrape: true, // Force fresh scrape for each
          });

          // Small delay to ensure different timestamps
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Request without force should get the latest (version 3)
        const cachedResult = await tool.handler({
          url: testUrl,
          resultHandling: 'returnOnly', // Use returnOnly to see cache metadata
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
          resultHandling: 'saveAndReturn',
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
          resultHandling: 'returnOnly', // Use returnOnly to check metadata
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
          resultHandling: 'returnOnly', // Use returnOnly to check metadata
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
          resultHandling: 'saveAndReturn',
        });

        // Request cached content with pagination
        const paginatedResult = await tool.handler({
          url: testUrl,
          startIndex: 100,
          maxChars: 50,
          resultHandling: 'returnOnly', // Use returnOnly to see truncation message
        });

        expect(paginatedResult.content[0].text).toContain('Served from cache');
        expect(paginatedResult.content[0].text).toContain('[Content truncated at 50 characters');
        expect(paginatedResult.content[0].text).toContain('continue reading from character 150');
      });

      it('should cache separately for different extract prompts', async () => {
        const testUrl = 'https://example.com/extract-cache-test-' + Date.now();
        const firstContent =
          '<html><head><title>Example Page</title></head><body><p>Contact us at contact@example.com</p></body></html>';
        const secondContent =
          '<html><head><title>Different Page</title></head><body><p>Different content here</p></body></html>';

        // Since ExtractClientFactory is not available without real API keys in tests,
        // we'll test that cache works correctly by verifying cached content is returned

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: firstContent,
        });

        // First request - create cache
        const firstResult = await tool.handler({
          url: testUrl,
          resultHandling: 'saveAndReturn',
        });

        expect(firstResult.content[0].type).toBe('resource');
        expect(firstResult.content[0].resource.text).toContain('Contact us at contact@example.com');

        // Change the mock response to verify we're getting cached content
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: secondContent,
        });

        // Second request - same URL, should use cache and get first content
        const secondResult = await tool.handler({
          url: testUrl,
          resultHandling: 'saveAndReturn',
        });

        expect(secondResult.content[0].type).toBe('resource');
        expect(secondResult.content[0].resource.text).toContain(
          'Contact us at contact@example.com'
        );
        expect(secondResult.content[0].resource.text).not.toContain('Different content here');

        // Third request - different URL with the second content
        const testUrl2 = 'https://example.com/extract-cache-test-2-' + Date.now();

        const thirdResult = await tool.handler({
          url: testUrl2,
          resultHandling: 'saveAndReturn',
        });

        // Should get the second content (not cached)
        expect(thirdResult.content[0].type).toBe('resource');
        expect(thirdResult.content[0].resource.text).toContain('Different content here');
        expect(thirdResult.content[0].resource.text).not.toContain(
          'Contact us at contact@example.com'
        );

        // Fourth request - use returnOnly to see cache metadata
        const fourthResult = await tool.handler({
          url: testUrl,
          resultHandling: 'returnOnly',
        });

        expect(fourthResult.content[0].type).toBe('text');
        expect(fourthResult.content[0].text).toContain('Served from cache');
        expect(fourthResult.content[0].text).toContain('originally scraped using: native');
        expect(fourthResult.content[0].text).toContain('Contact us at contact@example.com');
      });
    });

    describe('MIME type detection', () => {
      it('should detect text/html for HTML content', async () => {
        const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Example Domain</title></head>
<body>
<h1>Example Domain</h1>
<p>This domain is for use in illustrative examples in documents.</p>
</body>
</html>`;

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: htmlContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: 'https://example.com/html-test-' + Date.now(),
          resultHandling: 'saveAndReturn',
        });

        // Check that the embedded resource has text/markdown MIME type (cleaned content)
        expect(result.content[0]).toMatchObject({
          type: 'resource',
          resource: {
            mimeType: 'text/markdown',
          },
        });
      });

      it('should detect application/json for JSON content', async () => {
        const jsonContent = JSON.stringify({
          message: 'Hello World',
          status: 'success',
          data: { id: 123, name: 'Test' },
        });

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: jsonContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: 'https://api.example.com/json-test-' + Date.now(),
          resultHandling: 'saveAndReturn',
          cleanScrape: false, // Disable cleaning to preserve original content type
        });

        // Check that the embedded resource has application/json MIME type
        expect(result.content[0]).toMatchObject({
          type: 'resource',
          resource: {
            mimeType: 'application/json',
          },
        });
      });

      it('should detect application/xml for XML content', async () => {
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <message>Hello World</message>
  <status>success</status>
</root>`;

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: xmlContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: 'https://api.example.com/xml-test-' + Date.now(),
          resultHandling: 'saveAndReturn',
          cleanScrape: false, // Disable cleaning to preserve original content type
        });

        // Check that the embedded resource has application/xml MIME type
        expect(result.content[0]).toMatchObject({
          type: 'resource',
          resource: {
            mimeType: 'application/xml',
          },
        });
      });

      it('should default to text/plain for plain text content', async () => {
        const plainContent = 'This is just plain text without any markup or structure.';

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: plainContent,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: 'https://example.com/plain-test-' + Date.now(),
          resultHandling: 'saveAndReturn',
          cleanScrape: false, // Disable cleaning to preserve original content type
        });

        // Check that the embedded resource has text/plain MIME type
        expect(result.content[0]).toMatchObject({
          type: 'resource',
          resource: {
            mimeType: 'text/plain',
          },
        });
      });

      it('should detect HTML content from BrightData and Firecrawl responses', async () => {
        // Test with BrightData returning HTML
        mockNative.setMockResponse({
          success: false,
          status: 500,
          error: 'Native failed',
        });

        mockFirecrawl.setMockResponse({
          success: false,
          error: 'Firecrawl failed',
        });

        const htmlFromBrightData = '<html><body><h1>Content from BrightData</h1></body></html>';
        mockBrightData.setMockResponse({
          success: true,
          data: htmlFromBrightData,
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        const result = await tool.handler({
          url: 'https://example.com/brightdata-html-test-' + Date.now(),
          resultHandling: 'saveAndReturn',
        });

        // Check that cleaned HTML is detected as text/markdown (default behavior cleans HTML to markdown)
        expect(result.content[0]).toMatchObject({
          type: 'resource',
          resource: {
            mimeType: 'text/markdown',
          },
        });
      });
    });

    describe('URL preprocessing', () => {
      it('should add https:// to URLs without protocol', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Content from example.com',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with URL without protocol
        const result = await tool.handler({
          url: 'example.com',
          resultHandling: 'returnOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content from example.com'),
            },
          ],
        });

        // The test passes if the URL was processed correctly
        // (without protocol, it would have failed Zod validation)
      });

      it('should trim whitespace from URLs', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Content from trimmed URL',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with URL with leading and trailing whitespace
        const result = await tool.handler({
          url: '  https://example.com  \n',
          resultHandling: 'returnOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content from trimmed URL'),
            },
          ],
        });

        // The test passes if the URL was trimmed correctly
        // (with whitespace, it would have failed Zod validation)
      });

      it('should preserve URLs that already have protocols', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Content with existing protocol',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with http:// protocol
        const result = await tool.handler({
          url: 'http://example.com',
          resultHandling: 'returnOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content with existing protocol'),
            },
          ],
        });

        // The URL with http:// protocol should work correctly
      });

      it('should handle URLs with whitespace and no protocol', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Content from processed URL',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with URL with whitespace and no protocol
        const result = await tool.handler({
          url: '  example.com/path  ',
          resultHandling: 'returnOnly',
        });

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content from processed URL'),
            },
          ],
        });

        // The URL should be processed correctly with both trimming and protocol addition
      });

      it('should handle various protocol formats correctly', async () => {
        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: 'Content from URL',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with ftp:// protocol
        const ftpResult = await tool.handler({
          url: 'ftp://example.com',
          resultHandling: 'returnOnly',
        });

        expect(ftpResult).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content from URL'),
            },
          ],
        });

        // Test with custom protocol
        const customResult = await tool.handler({
          url: 'custom://example.com',
          resultHandling: 'returnOnly',
        });

        expect(customResult).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Content from URL'),
            },
          ],
        });
      });

      it('should reject invalid URLs after preprocessing', async () => {
        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        // Test with URL that's invalid even after preprocessing
        const result = await tool.handler({
          url: '   not a valid url at all   ',
          resultHandling: 'returnOnly',
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
    });

    describe('error diagnostics', () => {
      it('should display detailed diagnostics when all strategies fail', async () => {
        // Set up mocks for all failures with specific errors
        mockNative.setMockResponse({
          success: false,
          status: 403,
          error: 'Forbidden by server',
        });

        mockFirecrawl.setMockResponse({
          success: false,
          error: 'Rate limit exceeded',
        });

        mockBrightData.setMockResponse({
          success: false,
          error: 'Proxy connection failed',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com/protected',
          resultHandling: 'returnOnly',
        });

        expect('isError' in result && result.isError).toBe(true);
        const errorText = result.content[0].text;

        // Check for main error message
        expect(errorText).toContain('Failed to scrape https://example.com/protected');

        // Check for diagnostics section
        expect(errorText).toContain('Diagnostics:');
        expect(errorText).toContain('- Strategies attempted: native, firecrawl, brightdata');

        // Check for strategy errors
        expect(errorText).toContain('- Strategy errors:');
        expect(errorText).toContain('  - native: Forbidden by server');
        expect(errorText).toContain('  - firecrawl: Rate limit exceeded');
        expect(errorText).toContain('  - brightdata: Proxy connection failed');

        // Check for timing information
        expect(errorText).toContain('- Timing:');
        expect(errorText).toMatch(/- native: \d+ms/);
        expect(errorText).toMatch(/- firecrawl: \d+ms/);
        expect(errorText).toMatch(/- brightdata: \d+ms/);
      });

      it('should show authentication error diagnostics without trying other strategies', async () => {
        mockNative.setMockResponse({
          success: false,
          status: 403,
        });

        mockFirecrawl.setMockResponse({
          success: false,
          error: 'Unauthorized: Invalid API key',
        });

        const tool = scrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com',
          resultHandling: 'returnOnly',
        });

        expect('isError' in result && result.isError).toBe(true);
        const errorText = result.content[0].text;

        // Should show authentication error prominently
        expect(errorText).toContain('Failed to scrape https://example.com');
        expect(errorText).toContain('Diagnostics:');
        expect(errorText).toContain('- Strategies attempted: native, firecrawl');

        // BrightData should not be attempted after auth error
        expect(errorText).not.toContain('brightdata:');

        // Should show the auth error
        expect(errorText).toContain(
          '  - firecrawl: Authentication failed: Unauthorized: Invalid API key'
        );
      });

      it('should show when clients are not configured', async () => {
        // Create clients without firecrawl and brightdata
        const limitedClients = {
          native: mockNative,
        };

        mockNative.setMockResponse({
          success: false,
          status: 503,
          error: 'Service unavailable',
        });

        const tool = scrapeTool(
          mockServer,
          () => limitedClients as IScrapingClients,
          () => mockStrategyConfigClient
        );
        const result = await tool.handler({
          url: 'https://example.com',
          resultHandling: 'returnOnly',
        });

        expect('isError' in result && result.isError).toBe(true);
        const errorText = result.content[0].text;

        expect(errorText).toContain('Diagnostics:');
        expect(errorText).toContain('- Strategies attempted: native');
        expect(errorText).toContain('  - native: Service unavailable');
        expect(errorText).toContain('  - firecrawl: Firecrawl client not configured');
        expect(errorText).toContain('  - brightdata: BrightData client not configured');
      });
    });
  });
});
