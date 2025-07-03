import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import type { IStrategyConfigClient } from './strategy-config/index.js';
import { FilesystemStrategyConfigClient } from './strategy-config/index.js';

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
  scrape(
    url: string,
    options?: { timeout?: number } & RequestInit
  ): Promise<{
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }>;
}

// Native fetcher implementation
export class NativeFetcher implements INativeFetcher {
  async scrape(
    url: string,
    options?: { timeout?: number } & RequestInit
  ): Promise<{
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }> {
    try {
      const { timeout, ...fetchOptions } = options || {};

      let timeoutId: NodeJS.Timeout | undefined;
      const controller = new AbortController();

      if (timeout) {
        timeoutId = setTimeout(() => controller.abort(), timeout);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'User-Agent': 'PulseMCP-Fetch/0.0.1',
          ...fetchOptions?.headers,
        },
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const data = await response.text();

      return {
        success: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out. The server did not respond within the timeout period. Consider increasing the timeout parameter if this URL typically takes longer to load.`,
        };
      }
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
export type StrategyConfigFactory = () => IStrategyConfigClient;

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

  const registerHandlers = async (
    server: Server,
    clientFactory?: ClientFactory,
    strategyConfigFactory?: StrategyConfigFactory
  ) => {
    // Use provided factory or create default clients
    const factory =
      clientFactory ||
      (() => {
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
      });

    // Use provided strategy config factory or create default
    const configFactory = strategyConfigFactory || (() => new FilesystemStrategyConfigClient());

    registerResources(server);
    const registerTools = createRegisterTools(factory, configFactory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
