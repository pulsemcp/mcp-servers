/**
 * Passthrough parser for content that doesn't need special parsing
 */

import { BaseContentParser, ParsedContent } from './base-parser.js';

export class PassthroughParser extends BaseContentParser {
  constructor() {
    // This parser handles everything else
    super(['*']);
  }

  canParse(_contentType: string): boolean {
    // Always returns true as this is the fallback parser
    return true;
  }

  async parse(data: ArrayBuffer | string, _contentType: string): Promise<ParsedContent> {
    let content: string;

    if (data instanceof ArrayBuffer) {
      // Convert ArrayBuffer to string
      const decoder = new TextDecoder('utf-8');
      content = decoder.decode(data);
    } else {
      content = data;
    }

    return {
      content,
      metadata: {
        originalType: _contentType,
      },
    };
  }
}
