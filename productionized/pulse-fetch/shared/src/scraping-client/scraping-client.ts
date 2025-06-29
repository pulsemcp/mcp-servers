/**
 * Main scraping client exports
 * Re-exports all scraping client interfaces and implementations
 */

// Native scraping client
export type {
  INativeScrapingClient,
  NativeScrapingOptions,
  NativeScrapingResult,
} from './native-scrape-client.js';
export { NativeScrapingClient } from './native-scrape-client.js';

// Firecrawl scraping client
export type {
  IFirecrawlScrapingClient,
  FirecrawlScrapingOptions,
  FirecrawlScrapingResult,
} from './firecrawl-scrape-client.js';
export { FirecrawlScrapingClient } from './firecrawl-scrape-client.js';

// BrightData scraping client
export type {
  IBrightDataScrapingClient,
  BrightDataScrapingOptions,
  BrightDataScrapingResult,
} from './brightdata-scrape-client.js';
export { BrightDataScrapingClient } from './brightdata-scrape-client.js';
