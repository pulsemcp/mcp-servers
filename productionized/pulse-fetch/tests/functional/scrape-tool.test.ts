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
import type { MultiResourceWrite } from '../../shared/src/storage/types.js';

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
      // Set up mock for successful native scrape with HTML content
      mockNative.setMockResponse({
        success: true,
        status: 200,
        data: '<html><body>Content to be saved as resource</body></html>',
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

      it.skip('should cache separately for different extract prompts', async () => {
        const testUrl = 'https://example.com/extract-cache-test-' + Date.now();

        // Create saved resources to simulate cache
        const savedResources: Array<{
          url: string;
          extract?: string;
          content: string;
          timestamp: string;
        }> = [];

        // Mock storage with our new findByUrlAndExtract method
        vi.doMock('../../shared/src/storage/index.js', () => ({
          ResourceStorageFactory: {
            create: vi.fn().mockResolvedValue({
              findByUrlAndExtract: vi
                .fn()
                .mockImplementation((url: string, extractPrompt?: string) => {
                  const matching = savedResources.filter((r) => {
                    if (r.url !== url) return false;
                    if (!extractPrompt && !r.extract) return true;
                    return r.extract === extractPrompt;
                  });

                  return matching.map((r) => ({
                    uri: `memory://extracted/${r.url}_${Date.now()}`,
                    name: r.url,
                    metadata: {
                      url: r.url,
                      timestamp: r.timestamp,
                      extractionPrompt: r.extract,
                    },
                  }));
                }),
              read: vi.fn().mockImplementation((uri: string) => {
                // Find the corresponding saved resource
                const resource = savedResources.find((r) => uri.includes(r.url));
                return { text: resource?.content || '', uri };
              }),
              writeMulti: vi.fn().mockImplementation((data: MultiResourceWrite) => {
                // Save the content for later retrieval
                if (data.extracted) {
                  savedResources.push({
                    url: data.url,
                    extract: data.metadata?.extract,
                    content: data.extracted,
                    timestamp: new Date().toISOString(),
                  });
                } else if (data.cleaned) {
                  savedResources.push({
                    url: data.url,
                    extract: undefined,
                    content: data.cleaned,
                    timestamp: new Date().toISOString(),
                  });
                }
                return {
                  raw: `memory://raw/${data.url}`,
                  cleaned: data.cleaned ? `memory://cleaned/${data.url}` : undefined,
                  extracted: data.extracted ? `memory://extracted/${data.url}` : undefined,
                };
              }),
            }),
            reset: vi.fn(),
          },
        }));

        // Mock ExtractClientFactory
        vi.doMock('../../shared/src/extract/index.js', () => ({
          ExtractClientFactory: {
            isAvailable: vi.fn().mockReturnValue(true),
            createFromEnv: vi.fn().mockReturnValue({
              extract: vi.fn().mockImplementation((content, query) => {
                if (query === 'extract title') {
                  return { success: true, content: 'The Title: Example Page' };
                } else if (query === 'extract emails') {
                  return { success: true, content: 'Emails found: contact@example.com' };
                }
                return { success: false, error: 'Unknown query' };
              }),
            }),
          },
        }));

        // Re-import to use mocked dependencies
        const { scrapeTool: mockedScrapeTool } = await import('../../shared/src/tools/scrape.js');
        const tool = mockedScrapeTool(
          mockServer,
          () => mockClients,
          () => mockStrategyConfigClient
        );

        mockNative.setMockResponse({
          success: true,
          status: 200,
          data: '<html><head><title>Example Page</title></head><body><p>Contact us at contact@example.com</p></body></html>',
        });

        // First request with extract="extract title"
        const firstResult = await tool.handler({
          url: testUrl,
          saveResult: true,
          extract: 'extract title',
        });

        expect(firstResult.content[0].text).toContain('The Title: Example Page');
        expect(firstResult.content[0].text).toContain('Scraped using: native');

        // Second request with same URL but different extract prompt - should NOT use cache
        const secondResult = await tool.handler({
          url: testUrl,
          saveResult: true,
          extract: 'extract emails',
        });

        expect(secondResult.content[0].text).toContain('Emails found: contact@example.com');
        expect(secondResult.content[0].text).toContain('Scraped using: native');
        expect(secondResult.content[0].text).not.toContain('The Title: Example Page');

        // Third request with same URL and same extract as first - should use cache
        const thirdResult = await tool.handler({
          url: testUrl,
          saveResult: true,
          extract: 'extract title',
        });

        expect(thirdResult.content[0].text).toContain('The Title: Example Page');
        expect(thirdResult.content[0].text).toContain('Served from cache');

        // Fourth request with same URL but no extract - should NOT use cache
        const fourthResult = await tool.handler({
          url: testUrl,
          saveResult: true,
        });

        expect(fourthResult.content[0].text).toContain('Example Page');
        expect(fourthResult.content[0].text).toContain('Scraped using: native');
        expect(fourthResult.content[0].text).not.toContain('The Title:');
        expect(fourthResult.content[0].text).not.toContain('Emails found:');

        // Clean up mocks
        vi.doUnmock('../../shared/src/storage/index.js');
        vi.doUnmock('../../shared/src/extract/index.js');
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
          saveResult: true,
        });

        // Check that the resource link has text/html MIME type
        expect(result.content[1]).toMatchObject({
          type: 'resource_link',
          mimeType: 'text/html',
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
          saveResult: true,
        });

        // Check that the resource link has application/json MIME type
        expect(result.content[1]).toMatchObject({
          type: 'resource_link',
          mimeType: 'application/json',
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
          saveResult: true,
        });

        // Check that the resource link has application/xml MIME type
        expect(result.content[1]).toMatchObject({
          type: 'resource_link',
          mimeType: 'application/xml',
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
          saveResult: true,
        });

        // Check that the resource link has text/plain MIME type
        expect(result.content[1]).toMatchObject({
          type: 'resource_link',
          mimeType: 'text/plain',
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
          saveResult: true,
        });

        // Check that HTML from BrightData is detected as text/html
        expect(result.content[1]).toMatchObject({
          type: 'resource_link',
          mimeType: 'text/html',
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
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
          saveResult: false,
        });

        expect(result.isError).toBe(true);
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
          saveResult: false,
        });

        expect(result.isError).toBe(true);
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
          saveResult: false,
        });

        expect(result.isError).toBe(true);
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
