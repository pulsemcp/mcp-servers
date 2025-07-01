import { ContentCleaner, CleanerOptions } from './index.js';
import { HtmlCleaner } from './html-cleaner.js';
import { PassThroughCleaner } from './pass-through-cleaner.js';
import { detectContentType } from './content-type-detector.js';

/**
 * Creates an appropriate cleaner based on content type
 * @param content The content to clean
 * @param url The source URL
 * @param options Cleaner options
 * @returns The appropriate content cleaner
 */
export function createCleaner(
  content: string,
  url: string,
  options?: CleanerOptions
): ContentCleaner {
  const contentType = detectContentType(content, url);

  // Create cleaners
  const htmlCleaner = new HtmlCleaner(options);
  const structuredDataCleaner = new PassThroughCleaner(
    ['application/json', 'application/xml'],
    options
  );
  const plainTextCleaner = new PassThroughCleaner(['text/plain'], options);

  // Select appropriate cleaner
  if (htmlCleaner.canHandle(contentType)) {
    return htmlCleaner;
  } else if (structuredDataCleaner.canHandle(contentType)) {
    return structuredDataCleaner;
  } else {
    return plainTextCleaner;
  }
}
