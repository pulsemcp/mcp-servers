import { describe, it, expect } from 'vitest';
import { PassThroughCleaner } from '../../shared/src/clean/pass-through-cleaner.js';

describe('PassThroughCleaner', () => {
  describe('JSON cleaner', () => {
    const jsonCleaner = new PassThroughCleaner(['application/json']);

    it('should handle JSON content type', () => {
      expect(jsonCleaner.canHandle('application/json')).toBe(true);
      expect(jsonCleaner.canHandle('text/html')).toBe(false);
    });

    it('should pass through JSON content unchanged', async () => {
      const jsonContent = '{"name": "test", "value": 123, "nested": {"key": "value"}}';
      const result = await jsonCleaner.clean(jsonContent, 'https://api.example.com/data.json');
      expect(result).toBe(jsonContent);
    });

    it('should handle JSON arrays', async () => {
      const jsonArray = '[1, 2, 3, {"id": 4}]';
      const result = await jsonCleaner.clean(jsonArray, 'https://api.example.com/list.json');
      expect(result).toBe(jsonArray);
    });
  });

  describe('XML cleaner', () => {
    const xmlCleaner = new PassThroughCleaner(['application/xml']);

    it('should handle XML content type', () => {
      expect(xmlCleaner.canHandle('application/xml')).toBe(true);
      expect(xmlCleaner.canHandle('application/json')).toBe(false);
    });

    it('should pass through XML content unchanged', async () => {
      const xmlContent = `<?xml version="1.0"?>
<root>
  <item id="1">
    <name>Test</name>
    <value>123</value>
  </item>
</root>`;
      const result = await xmlCleaner.clean(xmlContent, 'https://example.com/data.xml');
      expect(result).toBe(xmlContent);
    });
  });

  describe('Multiple content types', () => {
    const multiCleaner = new PassThroughCleaner([
      'application/json',
      'application/xml',
      'text/plain',
    ]);

    it('should handle multiple content types', () => {
      expect(multiCleaner.canHandle('application/json')).toBe(true);
      expect(multiCleaner.canHandle('application/xml')).toBe(true);
      expect(multiCleaner.canHandle('text/plain')).toBe(true);
      expect(multiCleaner.canHandle('text/html')).toBe(false);
    });
  });

  describe('Truncation', () => {
    const truncatingCleaner = new PassThroughCleaner(['text/plain'], { maxLength: 20 });

    it('should truncate content when exceeding maxLength', async () => {
      const longContent = 'This is a very long content that exceeds the maximum length limit.';
      const result = await truncatingCleaner.clean(longContent, 'https://example.com/long.txt');

      expect(result).toBe('This is a very long \n\n[Content truncated]');
      expect(result.startsWith('This is a very long ')).toBe(true);
      expect(result.endsWith('[Content truncated]')).toBe(true);
    });

    it('should not truncate content within maxLength', async () => {
      const shortContent = 'Short content';
      const result = await truncatingCleaner.clean(shortContent, 'https://example.com/short.txt');

      expect(result).toBe(shortContent);
    });
  });
});
