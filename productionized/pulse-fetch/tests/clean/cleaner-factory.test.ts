import { describe, it, expect } from 'vitest';
import { createCleaner } from '../../shared/src/clean/cleaner-factory.js';
import { HtmlCleaner } from '../../shared/src/clean/html-cleaner.js';
import { PassThroughCleaner } from '../../shared/src/clean/pass-through-cleaner.js';

describe('createCleaner', () => {
  it('should create HtmlCleaner for HTML content', () => {
    const htmlContent = '<!DOCTYPE html><html><body>Test</body></html>';
    const cleaner = createCleaner(htmlContent, 'https://example.com/page.html');
    expect(cleaner).toBeInstanceOf(HtmlCleaner);
  });

  it('should create PassThroughCleaner for JSON content', () => {
    const jsonContent = '{"test": true}';
    const cleaner = createCleaner(jsonContent, 'https://api.example.com/data.json');
    expect(cleaner).toBeInstanceOf(PassThroughCleaner);
    expect(cleaner.canHandle('application/json')).toBe(true);
  });

  it('should create PassThroughCleaner for XML content', () => {
    const xmlContent = '<?xml version="1.0"?><root>test</root>';
    const cleaner = createCleaner(xmlContent, 'https://example.com/feed.xml');
    expect(cleaner).toBeInstanceOf(PassThroughCleaner);
    expect(cleaner.canHandle('application/xml')).toBe(true);
  });

  it('should create PassThroughCleaner for plain text', () => {
    const plainContent = 'Just plain text without any markup';
    const cleaner = createCleaner(plainContent, 'https://example.com/readme.txt');
    expect(cleaner).toBeInstanceOf(PassThroughCleaner);
    expect(cleaner.canHandle('text/plain')).toBe(true);
  });

  it('should pass options to created cleaners', async () => {
    const longHtml = '<p>' + 'A'.repeat(100) + '</p>';
    const cleaner = createCleaner(longHtml, 'https://example.com', { maxLength: 20 });

    const result = await cleaner.clean(longHtml, 'https://example.com');
    expect(result).toContain('[Content truncated]');
  });

  it('should handle edge cases', () => {
    // Empty content
    const emptyCleaner = createCleaner('', 'https://example.com');
    expect(emptyCleaner).toBeInstanceOf(PassThroughCleaner);
    expect(emptyCleaner.canHandle('text/plain')).toBe(true);

    // No URL provided
    const noUrlCleaner = createCleaner('Some content', '');
    expect(noUrlCleaner).toBeDefined();
  });
});
