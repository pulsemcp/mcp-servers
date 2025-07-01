export interface ContentFilter {
  /**
   * Filter raw content to extract the most relevant parts
   * @param content The raw content to filter
   * @param url The source URL (can help with context)
   * @returns The filtered content
   */
  filter(content: string, url: string): Promise<string>;

  /**
   * Check if this filter can handle the given content type
   * @param contentType The detected content type
   * @returns Whether this filter should be used
   */
  canHandle(contentType: string): boolean;
}

export interface FilterOptions {
  /**
   * Maximum length of filtered content (optional)
   * If not specified, the filter will use its own judgment
   */
  maxLength?: number;
}

export { detectContentType } from './content-type-detector.js';
export { createFilter } from './filter-factory.js';
