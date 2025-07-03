/**
 * Common TypeScript types for Pulse Fetch MCP server
 */

/**
 * Standard response format for MCP tools
 */
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Scraping result interface
 */
export interface ScrapeResult {
  success: boolean;
  content?: string;
  source: 'native' | 'firecrawl' | 'brightdata';
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result handling options for scrape results
 */
export type ResultHandling = 'saveOnly' | 'saveAndReturn' | 'returnOnly';

/**
 * Scraping options interface
 */
export interface ScrapeOptions {
  timeout?: number;
  extract?: string;
  maxChars?: number;
  startIndex?: number;
  resultHandling?: ResultHandling;
}
