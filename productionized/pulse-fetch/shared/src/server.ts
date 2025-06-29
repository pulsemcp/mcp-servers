import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';

// Scraping client interfaces for external services
export interface IFirecrawlClient {
  scrape(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data?: {
      content: string;
      markdown: string;
      html: string;
      metadata: Record<string, unknown>;
    };
    error?: string;
  }>;
}

export interface IBrightDataClient {
  scrape(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>;
}

export interface INativeFetcher {
  fetch(
    url: string,
    options?: RequestInit
  ): Promise<{
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }>;
}

// Native fetcher implementation
export class NativeFetcher implements INativeFetcher {
  async fetch(
    url: string,
    options?: RequestInit
  ): Promise<{
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'PulseMCP-Fetch/0.0.1',
          ...options?.headers,
        },
      });

      const data = await response.text();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Firecrawl client implementation
export class FirecrawlClient implements IFirecrawlClient {
  constructor(private apiKey: string) {}

  async scrape(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data?: {
      content: string;
      markdown: string;
      html: string;
      metadata: Record<string, unknown>;
    };
    error?: string;
  }> {
    const { scrapeWithFirecrawl } = await import('./scraping-client/lib/firecrawl-scrape.js');
    return scrapeWithFirecrawl(this.apiKey, url, options);
  }
}

// BrightData client implementation
export class BrightDataClient implements IBrightDataClient {
  constructor(private bearerToken: string) {}

  async scrape(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    const { scrapeWithBrightData } = await import('./scraping-client/lib/brightdata-scrape.js');
    return scrapeWithBrightData(this.bearerToken, url, options);
  }
}

export interface IScrapingClients {
  native: INativeFetcher;
  firecrawl?: IFirecrawlClient;
  brightData?: IBrightDataClient;
}

export type ClientFactory = () => IScrapingClients;

export function createMCPServer() {
  const server = new Server(
    {
      name: '@pulsemcp/pulse-fetch',
      version: '0.0.1',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default clients
    const factory =
      clientFactory ||
      (() => {
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        const brightDataToken = process.env.BRIGHTDATA_BEARER_TOKEN;

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
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
