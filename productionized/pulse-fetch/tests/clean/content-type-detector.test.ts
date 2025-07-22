import { describe, it, expect } from 'vitest';
import { detectContentType } from '../../shared/src/clean/content-type-detector.js';

describe('detectContentType', () => {
  describe('URL-based detection', () => {
    it('should detect JSON from .json extension', () => {
      expect(detectContentType('{"test": true}', 'https://api.example.com/data.json')).toBe(
        'application/json'
      );
    });

    it('should detect XML from .xml extension', () => {
      expect(detectContentType('<root>test</root>', 'https://example.com/feed.xml')).toBe(
        'application/xml'
      );
    });

    it('should detect XML from .rss extension', () => {
      expect(detectContentType('<rss>test</rss>', 'https://example.com/feed.rss')).toBe(
        'application/xml'
      );
    });

    it('should detect HTML from .html extension', () => {
      expect(detectContentType('<html>test</html>', 'https://example.com/page.html')).toBe(
        'text/html'
      );
    });
  });

  describe('Content-based detection', () => {
    it('should detect XML from <?xml declaration', () => {
      expect(detectContentType('<?xml version="1.0"?><root>test</root>')).toBe('application/xml');
    });

    it('should detect XML from <rss tag', () => {
      expect(detectContentType('<rss version="2.0"><channel>test</channel></rss>')).toBe(
        'application/xml'
      );
    });

    it('should detect JSON from object structure', () => {
      expect(detectContentType('{"name": "test", "value": 123}')).toBe('application/json');
    });

    it('should detect JSON from array structure', () => {
      expect(detectContentType('[1, 2, 3, "test"]')).toBe('application/json');
    });

    it('should detect HTML from doctype', () => {
      expect(detectContentType('<!DOCTYPE html><html><body>test</body></html>')).toBe('text/html');
    });

    it('should detect HTML from html tag', () => {
      expect(detectContentType('<html><head><title>Test</title></head></html>')).toBe('text/html');
    });

    it('should detect HTML from head and body tags', () => {
      expect(detectContentType('<head><title>Test</title></head><body>Content</body>')).toBe(
        'text/html'
      );
    });

    it('should detect HTML from meta and title tags', () => {
      expect(detectContentType('<meta charset="utf-8"><title>Test Page</title>')).toBe('text/html');
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace', () => {
      expect(detectContentType('  \n  {"test": true}  \n  ')).toBe('application/json');
    });

    it('should not detect invalid JSON as JSON', () => {
      expect(detectContentType('{invalid json}')).toBe('text/plain'); // Plain text since it's not valid JSON
    });

    it('should detect generic XML-like content as HTML', () => {
      expect(detectContentType('<div>test</div>')).toBe('text/html');
    });

    it('should default to plain text for unrecognized content', () => {
      expect(detectContentType('Just plain text without any markup')).toBe('text/plain');
    });

    it('should handle empty content', () => {
      expect(detectContentType('')).toBe('text/plain');
    });
  });
});
