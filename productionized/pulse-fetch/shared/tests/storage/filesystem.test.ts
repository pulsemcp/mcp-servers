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

    it('should create subdirectories for raw, cleaned, and extracted', async () => {
      const customDir = path.join(testDir, 'custom-subdirs');
      const customStorage = new FileSystemResourceStorage(customDir);

      await customStorage.init();

      const rawStats = await fs.stat(path.join(customDir, 'raw'));
      const cleanedStats = await fs.stat(path.join(customDir, 'cleaned'));
      const extractedStats = await fs.stat(path.join(customDir, 'extracted'));

      expect(rawStats.isDirectory()).toBe(true);
      expect(cleanedStats.isDirectory()).toBe(true);
      expect(extractedStats.isDirectory()).toBe(true);
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

    it('should write to the appropriate subdirectory based on resourceType', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';

      const rawUri = await storage.write(url, content, { resourceType: 'raw' });
      const cleanedUri = await storage.write(url, content, { resourceType: 'cleaned' });
      const extractedUri = await storage.write(url, content, { resourceType: 'extracted' });

      expect(rawUri).toContain('/raw/');
      expect(cleanedUri).toContain('/cleaned/');
      expect(extractedUri).toContain('/extracted/');
    });
  });

  describe('writeMulti', () => {
    it('should write raw, cleaned, and extracted content to separate files', async () => {
      const url = 'https://example.com/multi-test';
      const rawContent = '<html>Raw HTML content</html>';
      const cleanedContent = 'Cleaned content';
      const extractedContent = 'Extracted information';

      const uris = await storage.writeMulti({
        url,
        raw: rawContent,
        cleaned: cleanedContent,
        extracted: extractedContent,
        metadata: {
          source: 'test-scraper',
          extract: 'test extraction prompt',
        },
      });

      expect(uris.raw).toMatch(/\/raw\//);
      expect(uris.cleaned).toMatch(/\/cleaned\//);
      expect(uris.extracted).toMatch(/\/extracted\//);

      // Verify content
      const rawResult = await storage.read(uris.raw);
      const cleanedResult = await storage.read(uris.cleaned!);
      const extractedResult = await storage.read(uris.extracted!);

      expect(rawResult.text).toBe(rawContent);
      expect(cleanedResult.text).toBe(cleanedContent);
      expect(extractedResult.text).toBe(extractedContent);
    });

    it('should only write raw content when filtered and extracted are not provided', async () => {
      const url = 'https://example.com/raw-only';
      const rawContent = 'Only raw content';

      const uris = await storage.writeMulti({
        url,
        raw: rawContent,
      });

      expect(uris.raw).toBeDefined();
      expect(uris.cleaned).toBeUndefined();
      expect(uris.extracted).toBeUndefined();
    });

    it('should include extraction prompt in extracted file metadata', async () => {
      const url = 'https://example.com/extract-test';
      const extractPrompt = 'Extract the main article title and author';

      const uris = await storage.writeMulti({
        url,
        raw: 'Raw content',
        extracted: 'Title: Test, Author: John',
        metadata: {
          extract: extractPrompt,
        },
      });

      const filePath = uris.extracted!.substring(7);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      expect(fileContent).toContain(`extractionPrompt: "${extractPrompt}"`);
    });

    it('should use the same filename across all subdirectories', async () => {
      const url = 'https://example.com/same-filename';

      const uris = await storage.writeMulti({
        url,
        raw: 'Raw',
        cleaned: 'Cleaned',
        extracted: 'Extracted',
      });

      const rawFilename = path.basename(uris.raw);
      const cleanedFilename = path.basename(uris.cleaned!);
      const extractedFilename = path.basename(uris.extracted!);

      expect(rawFilename).toBe(cleanedFilename);
      expect(rawFilename).toBe(extractedFilename);
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
      await fs.writeFile(path.join(testDir, 'raw', 'ignore.txt'), 'Should be ignored');

      const resources = await storage.list();

      expect(resources).toHaveLength(1);
      expect(resources[0].metadata.url).toBe('https://example.com/test');
    });

    it('should list resources from all subdirectories', async () => {
      await storage.write('https://example.com/raw', 'Raw content', { resourceType: 'raw' });
      await storage.write('https://example.com/cleaned', 'Cleaned content', {
        resourceType: 'cleaned',
      });
      await storage.write('https://example.com/extracted', 'Extracted content', {
        resourceType: 'extracted',
      });

      const resources = await storage.list();

      expect(resources).toHaveLength(3);
      const resourceTypes = resources.map((r) => r.metadata.resourceType).sort();
      expect(resourceTypes).toEqual(['cleaned', 'extracted', 'raw']);
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
      const invalidFile = path.join(testDir, 'raw', 'invalid.md');
      await fs.writeFile(invalidFile, 'Invalid content without frontmatter');

      // Should still return the valid resource
      const resources = await storage.findByUrl(testUrl);
      expect(resources).toHaveLength(1);
    });

    it('should find resources across all subdirectories', async () => {
      const testUrl = 'https://example.com/multi-dir-test-' + Date.now();

      // Write the same URL to different subdirectories using writeMulti
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
