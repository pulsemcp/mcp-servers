import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryResourceStorage } from '../../shared/src/storage/memory.js';
import { FileSystemResourceStorage } from '../../shared/src/storage/filesystem.js';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

describe('Storage findByUrlAndExtract', () => {
  describe('MemoryResourceStorage', () => {
    let storage: MemoryResourceStorage;

    beforeEach(() => {
      storage = new MemoryResourceStorage();
    });

    it('should find resources by URL and extract prompt', async () => {
      const url = 'https://example.com/test';

      // Write resources with different extract prompts
      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content',
        extracted: 'Title: Test Page',
        metadata: {
          extract: 'get the title',
        },
      });

      // Add delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content',
        extracted: 'Email: test@example.com',
        metadata: {
          extract: 'find emails',
        },
      });

      // Add delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content without extraction',
      });

      // Test finding by URL and specific extract prompt
      const titleResources = await storage.findByUrlAndExtract(url, 'get the title');
      expect(titleResources).toHaveLength(1);
      expect(titleResources[0].metadata.extractionPrompt).toBe('get the title');

      const emailResources = await storage.findByUrlAndExtract(url, 'find emails');
      expect(emailResources).toHaveLength(1);
      expect(emailResources[0].metadata.extractionPrompt).toBe('find emails');

      // Test finding resources without extraction
      const noExtractResources = await storage.findByUrlAndExtract(url);
      // Should find resources without extractionPrompt
      expect(noExtractResources.length).toBeGreaterThan(0);
      expect(noExtractResources.every((r) => !r.metadata.extractionPrompt)).toBe(true);

      // Test no matches for non-existent extract prompt
      const noMatches = await storage.findByUrlAndExtract(url, 'non-existent prompt');
      expect(noMatches).toHaveLength(0);
    });

    it('should return most recent resource when multiple exist for same extract', async () => {
      const url = 'https://example.com/test-order';

      // Add slight delays to ensure different timestamps
      await storage.writeMulti({
        url,
        raw: 'raw1',
        extracted: 'Old extraction',
        metadata: { extract: 'test query' },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.writeMulti({
        url,
        raw: 'raw2',
        extracted: 'New extraction',
        metadata: { extract: 'test query' },
      });

      const resources = await storage.findByUrlAndExtract(url, 'test query');
      expect(resources).toHaveLength(2);
      // Most recent should be first
      const content = await storage.read(resources[0].uri);
      expect(content.text).toBe('New extraction');
    });
  });

  describe('FileSystemResourceStorage', () => {
    let storage: FileSystemResourceStorage;
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'pulse-fetch-test-'));
      storage = new FileSystemResourceStorage(tempDir);
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should find resources by URL and extract prompt', async () => {
      const url = 'https://example.com/filesystem-test';

      // Write resources with different extract prompts
      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content',
        extracted: 'Title: Test Page',
        metadata: {
          extract: 'get the title',
        },
      });

      // Add delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content',
        extracted: 'Email: test@example.com',
        metadata: {
          extract: 'find emails',
        },
      });

      // Add delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.writeMulti({
        url,
        raw: '<html><body>Raw content</body></html>',
        cleaned: 'Cleaned content without extraction',
      });

      // Test finding by URL and specific extract prompt
      const titleResources = await storage.findByUrlAndExtract(url, 'get the title');
      expect(titleResources).toHaveLength(1);
      expect(titleResources[0].metadata.extractionPrompt).toBe('get the title');

      const emailResources = await storage.findByUrlAndExtract(url, 'find emails');
      expect(emailResources).toHaveLength(1);
      expect(emailResources[0].metadata.extractionPrompt).toBe('find emails');

      // Test finding resources without extraction
      const noExtractResources = await storage.findByUrlAndExtract(url);
      // Should find raw and cleaned resources (not extracted)
      const types = noExtractResources.map((r) => r.metadata.resourceType);
      expect(types).toContain('raw');
      expect(types).toContain('cleaned');
      expect(types).not.toContain('extracted');
      expect(noExtractResources.every((r) => !r.metadata.extractionPrompt)).toBe(true);

      // Test no matches for non-existent extract prompt
      const noMatches = await storage.findByUrlAndExtract(url, 'non-existent prompt');
      expect(noMatches).toHaveLength(0);
    });
  });
});
