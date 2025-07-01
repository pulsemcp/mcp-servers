import { BaseFilter } from './base-filter.js';

/**
 * A filter that passes content through unchanged
 * Used for JSON, XML, and other structured formats
 */
export class PassThroughFilter extends BaseFilter {
  private readonly supportedTypes: Set<string>;

  constructor(supportedTypes: string[], options?: { maxLength?: number }) {
    super(options);
    this.supportedTypes = new Set(supportedTypes);
  }

  async filter(content: string, _url: string): Promise<string> {
    // Simply pass through the content, applying truncation if needed
    return this.truncateIfNeeded(content);
  }

  canHandle(contentType: string): boolean {
    return this.supportedTypes.has(contentType);
  }
}
