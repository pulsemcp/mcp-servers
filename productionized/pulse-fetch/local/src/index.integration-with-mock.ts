#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import type {
  IScrapingClients,
  INativeFetcher,
  IFirecrawlClient,
  IBrightDataClient,
} from '../shared/index.js';

// Mock client implementations for integration testing
class MockNativeFetcher implements INativeFetcher {
  async scrape(_url: string): Promise<{
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }> {
    const mockData = process.env.MOCK_NATIVE_DATA;
    const mockSuccess = process.env.MOCK_NATIVE_SUCCESS === 'true';
    const mockStatus = parseInt(process.env.MOCK_NATIVE_STATUS || '200');

    if (mockSuccess && mockData) {
      return {
        success: true,
        status: mockStatus,
        data: mockData,
      };
    }

    return {
      success: false,
      status: mockStatus,
      error: 'Mock native fetch failed',
    };
  }
}

class MockFirecrawlClient implements IFirecrawlClient {
  async scrape(_url: string): Promise<{
    success: boolean;
    data?: {
      content: string;
      markdown: string;
      html: string;
      metadata: Record<string, unknown>;
    };
    error?: string;
  }> {
    const mockData = process.env.MOCK_FIRECRAWL_DATA;
    const mockSuccess = process.env.MOCK_FIRECRAWL_SUCCESS === 'true';

    if (mockSuccess && mockData) {
      return {
        success: true,
        data: {
          content: mockData,
          markdown: mockData,
          html: `<html><body>${mockData}</body></html>`,
          metadata: { source: 'firecrawl-mock' },
        },
      };
    }

    return {
      success: false,
      error: 'Mock Firecrawl failed',
    };
  }
}

class MockBrightDataClient implements IBrightDataClient {
  async scrape(_url: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    const mockData = process.env.MOCK_BRIGHTDATA_DATA;
    const mockSuccess = process.env.MOCK_BRIGHTDATA_SUCCESS === 'true';

    if (mockSuccess && mockData) {
      return {
        success: true,
        data: mockData,
      };
    }

    return {
      success: false,
      error: 'Mock BrightData failed',
    };
  }
}

async function main() {
  const { server, registerHandlers } = createMCPServer();

  // Create mock client factory for testing
  const mockClientFactory = (): IScrapingClients => ({
    native: new MockNativeFetcher(),
    firecrawl: process.env.ENABLE_FIRECRAWL_MOCK === 'true' ? new MockFirecrawlClient() : undefined,
    brightData:
      process.env.ENABLE_BRIGHTDATA_MOCK === 'true' ? new MockBrightDataClient() : undefined,
  });

  await registerHandlers(server, mockClientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Integration test server error:', error);
  process.exit(1);
});
