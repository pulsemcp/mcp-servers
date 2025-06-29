/**
 * Firecrawl scraping client implementation
 * Provides enhanced content extraction using Firecrawl API
 */

export interface IFirecrawlScrapingClient {
  scrape(url: string, options?: FirecrawlScrapingOptions): Promise<FirecrawlScrapingResult>;
}

export interface FirecrawlScrapingOptions {
  formats?: Array<'markdown' | 'html'>;
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  extract?: {
    schema?: Record<string, unknown>;
    systemPrompt?: string;
    prompt?: string;
  };
  removeBase64Images?: boolean;
}

export interface FirecrawlScrapingResult {
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    html: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
}

export class FirecrawlScrapingClient implements IFirecrawlScrapingClient {
  constructor(private apiKey: string) {}

  async scrape(
    url: string,
    options: FirecrawlScrapingOptions = {}
  ): Promise<FirecrawlScrapingResult> {
    const { scrapeWithFirecrawl } = await import('./lib/firecrawl-scrape.js');
    return scrapeWithFirecrawl(this.apiKey, url, options as Record<string, unknown>);
  }
}
