/**
 * Base interface for content parsers
 */

export interface ParsedContent {
  content: string;
  metadata?: {
    originalType: string;
    [key: string]: unknown;
  };
}

export interface ContentParser {
  canParse(contentType: string): boolean;
  parse(data: ArrayBuffer | string, contentType: string): Promise<ParsedContent>;
}

export abstract class BaseContentParser implements ContentParser {
  protected supportedTypes: string[];

  constructor(supportedTypes: string[]) {
    this.supportedTypes = supportedTypes;
  }

  canParse(contentType: string): boolean {
    return this.supportedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );
  }

  abstract parse(data: ArrayBuffer | string, contentType: string): Promise<ParsedContent>;
}
