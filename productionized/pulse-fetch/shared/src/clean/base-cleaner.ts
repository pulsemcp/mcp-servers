import { ContentCleaner } from './index.js';

/**
 * Base implementation for content cleaners
 */
export abstract class BaseCleaner implements ContentCleaner {
  constructor(protected readonly options?: { maxLength?: number }) {}

  abstract clean(content: string, url: string): Promise<string>;
  abstract canHandle(contentType: string): boolean;

  /**
   * Truncate content if maxLength is specified
   */
  protected truncateIfNeeded(content: string): string {
    if (this.options?.maxLength && content.length > this.options.maxLength) {
      return content.substring(0, this.options.maxLength) + '\n\n[Content truncated]';
    }
    return content;
  }
}
