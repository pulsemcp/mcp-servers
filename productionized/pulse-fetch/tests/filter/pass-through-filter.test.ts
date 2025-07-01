import { describe, it, expect } from 'vitest';
import { PassThroughFilter } from '../../shared/src/filter/pass-through-filter.js';

describe('PassThroughFilter', () => {
  describe('JSON filter', () => {
    const jsonFilter = new PassThroughFilter(['application/json']);

    it('should handle JSON content type', () => {
      expect(jsonFilter.canHandle('application/json')).toBe(true);
      expect(jsonFilter.canHandle('text/html')).toBe(false);
    });

    it('should pass through JSON content unchanged', async () => {
      const jsonContent = '{"name": "test", "value": 123, "nested": {"key": "value"}}';
      const result = await jsonFilter.filter(jsonContent, 'https://api.example.com/data.json');
      expect(result).toBe(jsonContent);
    });

    it('should handle JSON arrays', async () => {
      const jsonArray = '[1, 2, 3, {"id": 4}]';
      const result = await jsonFilter.filter(jsonArray, 'https://api.example.com/list.json');
      expect(result).toBe(jsonArray);
    });
  });

  describe('XML filter', () => {
    const xmlFilter = new PassThroughFilter(['application/xml']);

    it('should handle XML content type', () => {
      expect(xmlFilter.canHandle('application/xml')).toBe(true);
      expect(xmlFilter.canHandle('application/json')).toBe(false);
    });

    it('should pass through XML content unchanged', async () => {
      const xmlContent = `<?xml version="1.0"?>
<root>
  <item id="1">
    <name>Test</name>
    <value>123</value>
  </item>
</root>`;
      const result = await xmlFilter.filter(xmlContent, 'https://example.com/data.xml');
      expect(result).toBe(xmlContent);
    });
  });

  describe('Multiple content types', () => {
    const multiFilter = new PassThroughFilter([
      'application/json',
      'application/xml',
      'text/plain',
    ]);

    it('should handle multiple content types', () => {
      expect(multiFilter.canHandle('application/json')).toBe(true);
      expect(multiFilter.canHandle('application/xml')).toBe(true);
      expect(multiFilter.canHandle('text/plain')).toBe(true);
      expect(multiFilter.canHandle('text/html')).toBe(false);
    });
  });

  describe('Truncation', () => {
    const truncatingFilter = new PassThroughFilter(['text/plain'], { maxLength: 20 });

    it('should truncate content when exceeding maxLength', async () => {
      const longContent = 'This is a very long content that exceeds the maximum length limit.';
      const result = await truncatingFilter.filter(longContent, 'https://example.com/long.txt');

      expect(result).toBe('This is a very long \n\n[Content truncated]');
      expect(result.startsWith('This is a very long ')).toBe(true);
      expect(result.endsWith('[Content truncated]')).toBe(true);
    });

    it('should not truncate content within maxLength', async () => {
      const shortContent = 'Short content';
      const result = await truncatingFilter.filter(shortContent, 'https://example.com/short.txt');

      expect(result).toBe(shortContent);
    });
  });
});
