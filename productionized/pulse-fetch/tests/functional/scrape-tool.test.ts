import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from '../../shared/dist/tools.js';
import { createMockScrapingClients } from '../mocks/scraping-clients.functional-mock.js';

describe('Scrape Tool', () => {
  let server: Server;
  let mockClients: ReturnType<typeof createMockScrapingClients>;

  beforeEach(() => {
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    mockClients = createMockScrapingClients();
    const registerTools = createRegisterTools(() => mockClients.clients);
    registerTools(server);
  });

  describe('scrape tool', () => {
    it('should use native fetcher when successful', async () => {
      // Set up native fetcher to succeed
      mockClients.mocks.native.setMockResponse({
        success: true,
        status: 200,
        data: 'Native content success',
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'https://example.com',
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Native content success'),
          },
        ],
      });
      expect(response.content[0].text).toContain('Scraped using: native');
    });

    it('should fallback to Firecrawl when native fails', async () => {
      // Set up native to fail
      mockClients.mocks.native.setMockResponse({
        success: false,
        status: 403,
        error: 'Forbidden',
      });

      // Set up Firecrawl to succeed
      mockClients.mocks.firecrawl.setMockResponse({
        success: true,
        data: {
          content: 'Firecrawl content success',
          markdown: '# Firecrawl content success',
          html: '<h1>Firecrawl content success</h1>',
          metadata: { source: 'firecrawl' },
        },
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'https://example.com',
            format: 'markdown',
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('# Firecrawl content success'),
          },
        ],
      });
      expect(response.content[0].text).toContain('Scraped using: firecrawl');
    });

    it('should fallback to BrightData when native and Firecrawl fail', async () => {
      // Set up native to fail
      mockClients.mocks.native.setMockResponse({
        success: false,
        status: 403,
        error: 'Forbidden',
      });

      // Set up Firecrawl to fail
      mockClients.mocks.firecrawl.setMockResponse({
        success: false,
        error: 'Firecrawl failed',
      });

      // Set up BrightData to succeed
      mockClients.mocks.brightData.setMockResponse({
        success: true,
        data: 'BrightData content success',
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'https://example.com',
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('BrightData content success'),
          },
        ],
      });
      expect(response.content[0].text).toContain('Scraped using: brightdata');
    });

    it('should return error when all methods fail', async () => {
      // Set up all clients to fail
      mockClients.mocks.native.setMockResponse({
        success: false,
        status: 403,
        error: 'Forbidden',
      });

      mockClients.mocks.firecrawl.setMockResponse({
        success: false,
        error: 'Firecrawl failed',
      });

      mockClients.mocks.brightData.setMockResponse({
        success: false,
        error: 'BrightData failed',
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'https://example.com',
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response).toMatchObject({
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

      mockClients.mocks.native.setMockResponse({
        success: true,
        status: 200,
        data: longContent,
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'https://example.com',
            maxChars: 100,
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response.content[0].text).toContain('[Content truncated at 100 characters');
      expect(response.content[0].text.length).toBeLessThan(longContent.length + 200); // Account for metadata
    });

    it('should validate input schema', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            url: 'invalid-url', // Invalid URL
          },
        },
      };

      await expect(server.request(request, {} as never)).rejects.toThrow();
    });

    it('should require url parameter', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'scrape',
          arguments: {
            // Missing required 'url' field
          },
        },
      };

      await expect(server.request(request, {} as never)).rejects.toThrow();
    });
  });
});
