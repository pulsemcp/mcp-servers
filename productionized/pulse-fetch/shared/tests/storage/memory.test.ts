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

      expect(uri).toMatch(/^memory:\/\/example.com_test_/);
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
});
