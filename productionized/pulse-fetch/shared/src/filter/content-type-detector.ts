/**
 * Detects the content type of the given content
 * @param content The content to analyze
 * @param url The source URL (can provide hints via extension)
 * @returns The detected content type
 */
export function detectContentType(content: string, url?: string): string {
  const trimmedContent = content.trim();

  // Check URL extension first if available
  if (url) {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'json':
        return 'application/json';
      case 'xml':
      case 'rss':
        return 'application/xml';
      case 'html':
      case 'htm':
        return 'text/html';
    }
  }

  // Check content patterns
  if (trimmedContent.startsWith('<?xml') || trimmedContent.startsWith('<rss')) {
    return 'application/xml';
  }

  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    try {
      JSON.parse(trimmedContent);
      return 'application/json';
    } catch {
      // Not valid JSON, continue checking
    }
  }

  // Check for HTML patterns
  if (
    trimmedContent.toLowerCase().includes('<!doctype html') ||
    trimmedContent.toLowerCase().includes('<html') ||
    (trimmedContent.includes('<head') && trimmedContent.includes('<body')) ||
    (trimmedContent.includes('<meta') && trimmedContent.includes('<title'))
  ) {
    return 'text/html';
  }

  // Default to HTML for web content
  if (trimmedContent.includes('<') && trimmedContent.includes('>')) {
    return 'text/html';
  }

  // Plain text as fallback
  return 'text/plain';
}
