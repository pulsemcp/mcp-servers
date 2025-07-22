/**
 * HTML content parser
 * Converts HTML to clean text/markdown
 */

import { BaseContentParser, ParsedContent } from './base-parser.js';

export class HTMLParser extends BaseContentParser {
  constructor() {
    super(['text/html', 'application/xhtml+xml']);
  }

  async parse(data: ArrayBuffer | string, contentType: string): Promise<ParsedContent> {
    let htmlContent: string;

    if (data instanceof ArrayBuffer) {
      // Convert ArrayBuffer to string
      const decoder = new TextDecoder('utf-8');
      htmlContent = decoder.decode(data);
    } else {
      htmlContent = data;
    }

    return {
      content: htmlContent,
      metadata: {
        originalType: contentType,
      },
    };
  }
}
