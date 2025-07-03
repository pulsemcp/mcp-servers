import type {
  INativeFetcher,
  IFirecrawlClient,
  IBrightDataClient,
  IScrapingClients,
} from '../../shared/build/server.js';

export interface MockNativeFetcher extends INativeFetcher {
  setMockResponse(response: {
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  }): void;
}

export interface MockFirecrawlClient extends IFirecrawlClient {
  setMockResponse(response: {
    success: boolean;
    data?: {
      content: string;
      markdown: string;
      html: string;
      metadata: Record<string, unknown>;
    };
    error?: string;
  }): void;
}

export interface MockBrightDataClient extends IBrightDataClient {
  setMockResponse(response: { success: boolean; data?: string; error?: string }): void;
}

export function createMockNativeFetcher(): MockNativeFetcher {
  let mockResponse: {
    success: boolean;
    status?: number;
    data?: string;
    error?: string;
  } = {
    success: true,
    status: 200,
    data: 'Mock native content',
  };

  return {
    async scrape(_url: string) {
      return mockResponse;
    },
    setMockResponse(response) {
      mockResponse = response;
    },
  };
}

export function createMockFirecrawlClient(): MockFirecrawlClient {
  let mockResponse: {
    success: boolean;
    data?: {
      content: string;
      markdown: string;
      html: string;
      metadata: Record<string, unknown>;
    };
    error?: string;
  } = {
    success: true,
    data: {
      content: 'Mock Firecrawl content',
      markdown: '# Mock Firecrawl content',
      html: '<h1>Mock Firecrawl content</h1>',
      metadata: { source: 'firecrawl' },
    },
  };

  return {
    async scrape(_url: string) {
      return mockResponse;
    },
    setMockResponse(response) {
      mockResponse = response;
    },
  };
}

export function createMockBrightDataClient(): MockBrightDataClient {
  let mockResponse: {
    success: boolean;
    data?: string;
    error?: string;
  } = {
    success: true,
    data: 'Mock BrightData content',
  };

  return {
    async scrape(_url: string) {
      return mockResponse;
    },
    setMockResponse(response) {
      mockResponse = response;
    },
  };
}

export function createMockScrapingClients(): {
  clients: IScrapingClients;
  mocks: {
    native: MockNativeFetcher;
    firecrawl: MockFirecrawlClient;
    brightData: MockBrightDataClient;
  };
} {
  const native = createMockNativeFetcher();
  const firecrawl = createMockFirecrawlClient();
  const brightData = createMockBrightDataClient();

  return {
    clients: {
      native,
      firecrawl,
      brightData,
    },
    mocks: {
      native,
      firecrawl,
      brightData,
    },
  };
}
