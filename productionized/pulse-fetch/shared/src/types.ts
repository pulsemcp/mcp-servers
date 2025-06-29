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
 * Scraping options interface
 */
export interface ScrapeOptions {
  format?: 'markdown' | 'html' | 'rawHtml' | 'links' | 'extract';
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  maxChars?: number;
  startIndex?: number;
  saveResource?: boolean;
}
