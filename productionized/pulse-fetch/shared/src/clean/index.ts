/**
 * Content cleaning module
 * Converts HTML to clean markdown format
 */

import { convertHtmlToMarkdown } from 'dom-to-semantic-markdown';

interface Cleaner {
  clean(content: string, url: string): Promise<string>;
}

export function createCleaner(_content: string, _url: string): Cleaner {
  return {
    async clean(content: string, _url: string): Promise<string> {
      try {
        // Check if content is HTML
        const htmlRegex =
          /<(!DOCTYPE\s+)?html[^>]*>|<head[^>]*>|<body[^>]*>|<div[^>]*>|<p[^>]*>|<h[1-6][^>]*>/i;
        if (!htmlRegex.test(content.substring(0, 1000))) {
          // Not HTML, return as-is
          return content;
        }

        // Convert to markdown with semantic extraction
        const markdown = await convertHtmlToMarkdown(content, {
          extractMainContent: true,
        });

        return markdown || content;
      } catch (error) {
        console.error('Failed to clean content:', error);
        // Return original content if cleaning fails
        return content;
      }
    },
  };
}
