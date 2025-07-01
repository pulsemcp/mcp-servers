import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemResourceStorage } from '../../src/storage/filesystem.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('FileSystemResourceStorage', () => {
  let storage: FileSystemResourceStorage;
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = path.join(os.tmpdir(), `pulse-fetch-test-${Date.now()}`);
    storage = new FileSystemResourceStorage(testDir);
    await storage.init();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('init', () => {
    it('should create the root directory', async () => {
      const customDir = path.join(testDir, 'custom');
      const customStorage = new FileSystemResourceStorage(customDir);

      await customStorage.init();

      const stats = await fs.stat(customDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('write', () => {
    it('should write a resource as a markdown file', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      const metadata = { title: 'Test Title', contentType: 'text/html' };

      const uri = await storage.write(url, content, metadata);

      expect(uri).toMatch(/^file:\/\//);

      // Verify file exists
      const filePath = uri.substring(7); // Remove 'file://'
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toContain('Test content');
      expect(fileContent).toContain('title: "Test Title"');
    });

    it('should create valid markdown with frontmatter', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';

      const uri = await storage.write(url, content);
      const filePath = uri.substring(7);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      expect(fileContent).toMatch(/^---\n[\s\S]*?\n---\n/);
      expect(fileContent).toContain(`url: "${url}"`);
    });
  });

  describe('list', () => {
    it('should return empty array for empty directory', async () => {
      const resources = await storage.list();
      expect(resources).toEqual([]);
    });

    it('should list all markdown files as resources', async () => {
      await storage.write('https://example.com/1', 'Content 1', { title: 'Page 1' });
      await storage.write('https://example.com/2', 'Content 2', { title: 'Page 2' });

      const resources = await storage.list();

      expect(resources).toHaveLength(2);
      expect(resources.map((r) => r.metadata.url).sort()).toEqual([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should ignore non-markdown files', async () => {
      await storage.write('https://example.com/test', 'Content');
      await fs.writeFile(path.join(testDir, 'ignore.txt'), 'Should be ignored');

      const resources = await storage.list();

      expect(resources).toHaveLength(1);
      expect(resources[0].metadata.url).toBe('https://example.com/test');
    });
  });

  describe('read', () => {
    it('should read a written resource', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      const uri = await storage.write(url, content, { contentType: 'text/plain' });

      const result = await storage.read(uri);

      expect(result.uri).toBe(uri);
      expect(result.text).toBe(content);
      expect(result.mimeType).toBe('text/plain');
    });

    it('should throw error for non-existent resource', async () => {
      await expect(storage.read('file:///non-existent')).rejects.toThrow('Resource not found');
    });

    it('should throw error for invalid URI', async () => {
      await expect(storage.read('invalid://uri')).rejects.toThrow('Invalid file URI');
    });
  });

  describe('exists', () => {
    it('should return true for existing resource', async () => {
      const uri = await storage.write('https://example.com', 'content');

      const exists = await storage.exists(uri);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent resource', async () => {
      const exists = await storage.exists('file:///non-existent/file.md');

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing resource file', async () => {
      const uri = await storage.write('https://example.com', 'content');

      await storage.delete(uri);

      expect(await storage.exists(uri)).toBe(false);
    });

    it('should throw error when deleting non-existent resource', async () => {
      await expect(storage.delete('file:///non-existent')).rejects.toThrow('Resource not found');
    });
  });

  describe('markdown file format', () => {
    it('should properly escape metadata values', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      const metadata = {
        title: 'Test "Title" with quotes',
        description: 'Line 1\nLine 2',
      };

      const uri = await storage.write(url, content, metadata);
      const result = await storage.read(uri);

      expect(result.text).toBe(content);
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

    it('should handle files with parsing errors gracefully', async () => {
      // Use a unique URL to avoid conflicts
      const testUrl = 'https://example.com/parse-error-test-' + Date.now();

      // Write a valid resource
      await storage.write(testUrl, 'Valid content');

      // Write an invalid markdown file directly
      const invalidFile = path.join(testDir, 'invalid.md');
      await fs.writeFile(invalidFile, 'Invalid content without frontmatter');

      // Should still return the valid resource
      const resources = await storage.findByUrl(testUrl);
      expect(resources).toHaveLength(1);
    });
  });
});
