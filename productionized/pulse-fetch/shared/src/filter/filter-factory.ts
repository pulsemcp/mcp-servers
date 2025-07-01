import { ContentFilter, FilterOptions } from './index.js';
import { HtmlFilter } from './html-filter.js';
import { PassThroughFilter } from './pass-through-filter.js';
import { detectContentType } from './content-type-detector.js';

/**
 * Creates an appropriate filter based on content type
 * @param content The content to filter
 * @param url The source URL
 * @param options Filter options
 * @returns The appropriate content filter
 */
export function createFilter(content: string, url: string, options?: FilterOptions): ContentFilter {
  const contentType = detectContentType(content, url);

  // Create filters
  const htmlFilter = new HtmlFilter(options);
  const structuredDataFilter = new PassThroughFilter(
    ['application/json', 'application/xml'],
    options
  );
  const plainTextFilter = new PassThroughFilter(['text/plain'], options);

  // Select appropriate filter
  if (htmlFilter.canHandle(contentType)) {
    return htmlFilter;
  } else if (structuredDataFilter.canHandle(contentType)) {
    return structuredDataFilter;
  } else {
    return plainTextFilter;
  }
}
