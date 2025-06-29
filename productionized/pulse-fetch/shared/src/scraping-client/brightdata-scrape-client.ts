/**
 * BrightData scraping client implementation
 * Provides anti-bot bypass capabilities using BrightData Web Unlocker
 */

export interface IBrightDataScrapingClient {
  scrape(url: string, options?: BrightDataScrapingOptions): Promise<BrightDataScrapingResult>;
}

export interface BrightDataScrapingOptions {
  zone?: string;
  format?: 'raw' | 'json';
  country?: string;
  render?: boolean;
  waitFor?: number;
}

export interface BrightDataScrapingResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class BrightDataScrapingClient implements IBrightDataScrapingClient {
  constructor(private bearerToken: string) {}

  async scrape(
    url: string,
    options: BrightDataScrapingOptions = {}
  ): Promise<BrightDataScrapingResult> {
    const { scrapeWithBrightData } = await import('./lib/brightdata-scrape.js');
    return scrapeWithBrightData(this.bearerToken, url, options as Record<string, unknown>);
  }
}
