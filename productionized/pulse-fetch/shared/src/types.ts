/**
 * Common TypeScript types for Pulse Fetch MCP server
 */

/**
 * Content types for MCP tool responses
 */
export type ToolContent =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image';
      data: string;
      mimeType: string;
    }
  | {
      type: 'resource_link';
      uri: string;
      name?: string;
      mimeType?: string;
      description?: string;
    };

/**
 * Standard response format for MCP tools
 */
export interface ToolResponse {
  content: ToolContent[];
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
  timeout?: number;
  extract?: string;
  maxChars?: number;
  startIndex?: number;
  saveResult?: boolean;
}
