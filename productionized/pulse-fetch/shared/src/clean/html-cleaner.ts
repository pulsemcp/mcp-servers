import { BaseCleaner } from './base-cleaner.js';
import { JSDOM } from 'jsdom';
import { convertHtmlToMarkdown } from 'dom-to-semantic-markdown';
import { logWarning } from '../logging.js';

/**
 * Cleaner for HTML content that extracts main content and converts to clean Markdown
 */
export class HtmlCleaner extends BaseCleaner {
  async clean(content: string, _url: string): Promise<string> {
    try {
      // Create a DOM instance
      const dom = new JSDOM(content);

      // Convert HTML to semantic markdown
      // This automatically:
      // - Extracts main content (removes nav, ads, etc.)
      // - Converts to clean, readable Markdown
      // - Preserves semantic structure
      const markdown = convertHtmlToMarkdown(content, {
        overrideDOMParser: new dom.window.DOMParser(),
        extractMainContent: true,
      });

      // Apply truncation if needed
      return this.truncateIfNeeded(markdown);
    } catch (error) {
      // If cleaning fails, return the original content
      logWarning('HtmlCleaner', `HTML cleaning failed, returning original content: ${error}`);
      return this.truncateIfNeeded(content);
    }
  }

  canHandle(contentType: string): boolean {
    return contentType === 'text/html';
  }
}
