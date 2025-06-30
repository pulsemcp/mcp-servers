import { describe, it, expect } from 'vitest';
import { extractUrlPattern } from '../../shared/src/scraping-strategies.js';

describe('extractUrlPattern', () => {
  describe('Basic patterns', () => {
    it('should return hostname for root URLs', () => {
      expect(extractUrlPattern('https://example.com')).toBe('example.com');
      expect(extractUrlPattern('https://example.com/')).toBe('example.com');
    });

    it('should return hostname for single-segment URLs', () => {
      expect(extractUrlPattern('https://example.com/about')).toBe('example.com');
      expect(extractUrlPattern('https://example.com/blog')).toBe('example.com');
    });

    it('should extract path up to last segment', () => {
      expect(extractUrlPattern('https://yelp.com/biz/dolly-san-francisco')).toBe('yelp.com/biz/');
      expect(extractUrlPattern('https://reddit.com/r/programming')).toBe('reddit.com/r/');
      expect(extractUrlPattern('https://example.com/blog/article')).toBe('example.com/blog/');
    });
  });

  describe('Multi-level paths', () => {
    it('should handle deeper paths correctly', () => {
      expect(extractUrlPattern('https://reddit.com/r/programming/comments/123/title')).toBe(
        'reddit.com/r/programming/comments/123/'
      );
      expect(extractUrlPattern('https://example.com/blog/2024/article')).toBe(
        'example.com/blog/2024/'
      );
      expect(extractUrlPattern('https://docs.example.com/api/v2/reference/methods')).toBe(
        'docs.example.com/api/v2/reference/'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle URLs with query parameters', () => {
      expect(extractUrlPattern('https://example.com/search?q=test')).toBe('example.com');
      expect(extractUrlPattern('https://example.com/blog/post?id=123')).toBe('example.com/blog/');
      expect(extractUrlPattern('https://youtube.com/watch?v=abc123')).toBe('youtube.com');
    });

    it('should handle URLs with fragments', () => {
      expect(extractUrlPattern('https://example.com/docs#section')).toBe('example.com');
      expect(extractUrlPattern('https://example.com/api/guide#auth')).toBe('example.com/api/');
      expect(extractUrlPattern('https://example.com/blog/post#comments')).toBe('example.com/blog/');
    });

    it('should handle URLs with trailing slashes', () => {
      expect(extractUrlPattern('https://example.com/blog/')).toBe('example.com');
      expect(extractUrlPattern('https://example.com/api/v1/')).toBe('example.com/api/');
      expect(extractUrlPattern('https://example.com/docs/guide/')).toBe('example.com/docs/');
      expect(extractUrlPattern('https://example.com/a/b/c/')).toBe('example.com/a/b/');
    });

    it('should handle URLs with both query params and fragments', () => {
      expect(extractUrlPattern('https://example.com/search/results?q=test#page2')).toBe(
        'example.com/search/'
      );
      expect(extractUrlPattern('https://example.com/api/docs?version=2#auth')).toBe(
        'example.com/api/'
      );
    });

    it('should handle URLs with ports', () => {
      expect(extractUrlPattern('https://example.com:8080')).toBe('example.com:8080');
      expect(extractUrlPattern('https://example.com:3000/api/v1')).toBe('example.com:3000/api/');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractUrlPattern('not-a-url')).toBe('not-a-url');
    });
  });

  describe('Real-world examples', () => {
    it('should handle various real URLs correctly', () => {
      // Always strips the last segment
      expect(extractUrlPattern('https://nytimes.com/2024/03/15/technology/ai-article.html')).toBe(
        'nytimes.com/2024/03/15/technology/'
      );
      expect(extractUrlPattern('https://bbc.com/news/world-us-canada-123456')).toBe(
        'bbc.com/news/'
      );
      expect(extractUrlPattern('https://amazon.com/dp/B08N5WRWNW')).toBe('amazon.com/dp/');
      expect(extractUrlPattern('https://stackoverflow.com/questions/123456/how-to-do-x')).toBe(
        'stackoverflow.com/questions/123456/'
      );
    });
  });
});
