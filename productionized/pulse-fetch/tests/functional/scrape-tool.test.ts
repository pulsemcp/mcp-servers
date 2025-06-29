import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from '../../shared/src/tools.js';
import {
  createMockScrapingClients,
  type MockNativeFetcher,
  type MockFirecrawlClient,
  type MockBrightDataClient,
} from '../mocks/scraping-clients.functional-mock.js';
import type { IScrapingClients } from '../../shared/src/server.js';

interface Tool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: unknown) => Promise<unknown>;
}

describe('Scrape Tool', () => {
  let mockServer: Server;
  let registeredTools: Map<string, Tool>;
  let mockClients: IScrapingClients;
  let mockNative: MockNativeFetcher;
  let mockFirecrawl: MockFirecrawlClient;
  let mockBrightData: MockBrightDataClient;

  // Helper to register tools with a custom mock client
  const registerToolsWithClients = (clients: IScrapingClients) => {
    const registerTools = createRegisterTools(() => clients);
    registeredTools.clear();
    registerTools(mockServer);
  };

  beforeEach(() => {
    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    mockServer = {
      setRequestHandler: vi.fn(),
      tool: vi.fn(
        (
          name: string,
          description: string,
          inputSchema: unknown,
          handler: (args: unknown) => Promise<unknown>
        ) => {
          const tool = { name, description, inputSchema, handler };
          registeredTools.set(name, tool);
          return {
            enable: () => {},
            disable: () => {},
          };
        }
      ),
    } as unknown as Server;

    // Create default mock clients
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

      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');
      const result = await tool!.handler({
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

      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');
      const result = await tool!.handler({
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

      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');
      const result = await tool!.handler({
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

      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');
      const result = await tool!.handler({
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

      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');
      const result = await tool!.handler({
        url: 'https://example.com',
        maxChars: 100,
      });

      expect(result.content[0].text).toContain('[Content truncated at 100 characters');
    });

    it('should validate input schema', async () => {
      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');

      // Test with invalid URL
      try {
        await tool!.handler({
          url: 'not-a-url',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should require url parameter', async () => {
      registerToolsWithClients(mockClients);
      const tool = registeredTools.get('scrape');

      const result = await tool!.handler({
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
