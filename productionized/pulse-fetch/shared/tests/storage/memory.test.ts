import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryResourceStorage } from '../../src/storage/memory.js';

describe('MemoryResourceStorage', () => {
  let storage: MemoryResourceStorage;

  beforeEach(() => {
    storage = new MemoryResourceStorage();
  });

  describe('write', () => {
    it('should write a resource and return a URI', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      const metadata = { title: 'Test Title', contentType: 'text/plain' };

      const uri = await storage.write(url, content, metadata);

      expect(uri).toMatch(/^memory:\/\/raw\/example.com_test_/);
    });

    it('should generate unique URIs for same URL at different times', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';

      const uri1 = await storage.write(url, content);
      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      const uri2 = await storage.write(url, content);

      expect(uri1).not.toBe(uri2);
    });

    it('should include resourceType in URI when specified', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';

      const rawUri = await storage.write(url, content, { resourceType: 'raw' });
      const cleanedUri = await storage.write(url, content, { resourceType: 'cleaned' });
      const extractedUri = await storage.write(url, content, { resourceType: 'extracted' });

      expect(rawUri).toContain('memory://raw/');
      expect(cleanedUri).toContain('memory://cleaned/');
      expect(extractedUri).toContain('memory://extracted/');
    });
  });

  describe('writeMulti', () => {
    it('should write multiple resource types and return all URIs', async () => {
      const url = 'https://example.com/multi';
      const rawContent = 'Raw content';
      const cleanedContent = 'Cleaned content';
      const extractedContent = 'Extracted content';

      const uris = await storage.writeMulti({
        url,
        raw: rawContent,
        cleaned: cleanedContent,
        extracted: extractedContent,
        metadata: {
          source: 'test',
          extract: 'test prompt',
        },
      });

      expect(uris.raw).toContain('memory://raw/');
      expect(uris.cleaned).toContain('memory://cleaned/');
      expect(uris.extracted).toContain('memory://extracted/');

      // Verify content
      const rawResult = await storage.read(uris.raw);
      const cleanedResult = await storage.read(uris.cleaned!);
      const extractedResult = await storage.read(uris.extracted!);

      expect(rawResult.text).toBe(rawContent);
      expect(cleanedResult.text).toBe(cleanedContent);
      expect(extractedResult.text).toBe(extractedContent);
    });

    it('should only write raw when filtered and extracted are not provided', async () => {
      const url = 'https://example.com/raw-only';
      const rawContent = 'Only raw';

      const uris = await storage.writeMulti({
        url,
        raw: rawContent,
      });

      expect(uris.raw).toBeDefined();
      expect(uris.cleaned).toBeUndefined();
      expect(uris.extracted).toBeUndefined();
    });

    it('should include extraction prompt in extracted resource metadata', async () => {
      const url = 'https://example.com/extract-test';
      const extractPrompt = 'Extract title and author';

      const uris = await storage.writeMulti({
        url,
        raw: 'Raw',
        extracted: 'Title: Test',
        metadata: {
          extract: extractPrompt,
        },
      });

      const resources = await storage.list();
      const extractedResource = resources.find((r) => r.uri === uris.extracted);

      expect(extractedResource?.metadata.extractionPrompt).toBe(extractPrompt);
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      const resources = await storage.list();
      expect(resources).toEqual([]);
    });

    it('should list all written resources', async () => {
      await storage.write('https://example.com/1', 'Content 1');
      await storage.write('https://example.com/2', 'Content 2');

      const resources = await storage.list();

      expect(resources).toHaveLength(2);
      expect(resources[0].metadata.url).toBe('https://example.com/1');
      expect(resources[1].metadata.url).toBe('https://example.com/2');
    });
  });

  describe('read', () => {
    it('should read a written resource', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      const uri = await storage.write(url, content);

      const result = await storage.read(uri);

      expect(result.uri).toBe(uri);
      expect(result.text).toBe(content);
    });

    it('should throw error for non-existent resource', async () => {
      await expect(storage.read('memory://non-existent')).rejects.toThrow('Resource not found');
    });
  });

  describe('exists', () => {
    it('should return true for existing resource', async () => {
      const uri = await storage.write('https://example.com', 'content');

      const exists = await storage.exists(uri);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent resource', async () => {
      const exists = await storage.exists('memory://non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing resource', async () => {
      const uri = await storage.write('https://example.com', 'content');

      await storage.delete(uri);

      expect(await storage.exists(uri)).toBe(false);
    });

    it('should throw error when deleting non-existent resource', async () => {
      await expect(storage.delete('memory://non-existent')).rejects.toThrow('Resource not found');
    });
  });

  describe('findByUrl', () => {
    it('should return empty array for URL with no resources', async () => {
      const resources = await storage.findByUrl('https://example.com/not-found');
      expect(resources).toEqual([]);
    });

    it('should find resources by exact URL', async () => {
      // Use a unique URL to avoid conflicts with other tests
      const testUrl = 'https://example.com/findbyurl-test-' + Date.now();
      const otherUrl = 'https://example.com/findbyurl-other-' + Date.now();

      await storage.write(testUrl, 'Content 1');
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      await storage.write(otherUrl, 'Content 2');
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      await storage.write(testUrl, 'Content 3');

      const resources = await storage.findByUrl(testUrl);

      expect(resources).toHaveLength(2);
      expect(resources.every((r) => r.metadata.url === testUrl)).toBe(true);
    });

    it('should return resources sorted by timestamp descending', async () => {
      // Use a unique URL to avoid conflicts with other tests
      const testUrl = 'https://example.com/timestamp-test-' + Date.now();

      // Write resources with small delays to ensure different timestamps
      await storage.write(testUrl, 'Old content');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.write(testUrl, 'Middle content');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await storage.write(testUrl, 'New content');

      const resources = await storage.findByUrl(testUrl);

      expect(resources).toHaveLength(3);
      // Check that timestamps are in descending order (newest first)
      const timestamps = resources.map((r) => new Date(r.metadata.timestamp).getTime());
      expect(timestamps[0]).toBeGreaterThan(timestamps[1]);
      expect(timestamps[1]).toBeGreaterThan(timestamps[2]);
    });

    it('should find resources across all resource types', async () => {
      const testUrl = 'https://example.com/multi-type-test-' + Date.now();

      // Write the same URL with different resource types
      await storage.writeMulti({
        url: testUrl,
        raw: 'Raw content',
        cleaned: 'Cleaned content',
        extracted: 'Extracted content',
      });

      const resources = await storage.findByUrl(testUrl);

      expect(resources).toHaveLength(3);
      const resourceTypes = resources.map((r) => r.metadata.resourceType).sort();
      expect(resourceTypes).toEqual(['cleaned', 'extracted', 'raw']);
    });
  });
});
