import { describe, it, expect } from 'vitest';
import { createFilter } from '../../shared/src/filter/filter-factory.js';
import { HtmlFilter } from '../../shared/src/filter/html-filter.js';
import { PassThroughFilter } from '../../shared/src/filter/pass-through-filter.js';

describe('createFilter', () => {
  it('should create HtmlFilter for HTML content', () => {
    const htmlContent = '<!DOCTYPE html><html><body>Test</body></html>';
    const filter = createFilter(htmlContent, 'https://example.com/page.html');
    expect(filter).toBeInstanceOf(HtmlFilter);
  });

  it('should create PassThroughFilter for JSON content', () => {
    const jsonContent = '{"test": true}';
    const filter = createFilter(jsonContent, 'https://api.example.com/data.json');
    expect(filter).toBeInstanceOf(PassThroughFilter);
    expect(filter.canHandle('application/json')).toBe(true);
  });

  it('should create PassThroughFilter for XML content', () => {
    const xmlContent = '<?xml version="1.0"?><root>test</root>';
    const filter = createFilter(xmlContent, 'https://example.com/feed.xml');
    expect(filter).toBeInstanceOf(PassThroughFilter);
    expect(filter.canHandle('application/xml')).toBe(true);
  });

  it('should create PassThroughFilter for plain text', () => {
    const plainContent = 'Just plain text without any markup';
    const filter = createFilter(plainContent, 'https://example.com/readme.txt');
    expect(filter).toBeInstanceOf(PassThroughFilter);
    expect(filter.canHandle('text/plain')).toBe(true);
  });

  it('should pass options to created filters', async () => {
    const longHtml = '<p>' + 'A'.repeat(100) + '</p>';
    const filter = createFilter(longHtml, 'https://example.com', { maxLength: 20 });

    const result = await filter.filter(longHtml, 'https://example.com');
    expect(result).toContain('[Content truncated]');
  });

  it('should handle edge cases', () => {
    // Empty content
    const emptyFilter = createFilter('', 'https://example.com');
    expect(emptyFilter).toBeInstanceOf(PassThroughFilter);
    expect(emptyFilter.canHandle('text/plain')).toBe(true);

    // No URL provided
    const noUrlFilter = createFilter('Some content', '');
    expect(noUrlFilter).toBeDefined();
  });
});
