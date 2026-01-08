import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemScreenshotStorage } from '../../shared/src/storage/filesystem.js';
import { ScreenshotStorageFactory } from '../../shared/src/storage/factory.js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Screenshot Storage', () => {
  let testStoragePath: string;
  let storage: FileSystemScreenshotStorage;

  beforeEach(async () => {
    // Create a unique test storage directory
    testStoragePath = path.join(os.tmpdir(), `playwright-storage-test-${Date.now()}`);
    storage = new FileSystemScreenshotStorage(testStoragePath);
    await storage.init();
  });

  afterEach(async () => {
    // Clean up test storage directory
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('FileSystemScreenshotStorage', () => {
    // Sample base64-encoded 1x1 red PNG
    const testBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    describe('write', () => {
      it('should save a screenshot and return file URI', async () => {
        const uri = await storage.write(testBase64, {
          pageUrl: 'https://example.com',
          pageTitle: 'Example',
          fullPage: false,
        });

        expect(uri).toMatch(/^file:\/\//);
        expect(uri).toContain('.png');
      });

      it('should create both PNG and JSON metadata files', async () => {
        const uri = await storage.write(testBase64, {
          pageUrl: 'https://example.com',
          pageTitle: 'Example',
          fullPage: false,
        });

        const pngPath = uri.replace('file://', '');
        const jsonPath = pngPath.replace('.png', '.json');

        const pngExists = await fs
          .access(pngPath)
          .then(() => true)
          .catch(() => false);
        const jsonExists = await fs
          .access(jsonPath)
          .then(() => true)
          .catch(() => false);

        expect(pngExists).toBe(true);
        expect(jsonExists).toBe(true);
      });

      it('should save correct metadata', async () => {
        const uri = await storage.write(testBase64, {
          pageUrl: 'https://example.com',
          pageTitle: 'Example Title',
          fullPage: true,
        });

        const jsonPath = uri.replace('file://', '').replace('.png', '.json');
        const metadata = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

        expect(metadata.pageUrl).toBe('https://example.com');
        expect(metadata.pageTitle).toBe('Example Title');
        expect(metadata.fullPage).toBe(true);
        expect(metadata.timestamp).toBeDefined();
      });
    });

    describe('read', () => {
      it('should read a saved screenshot', async () => {
        const uri = await storage.write(testBase64, {
          fullPage: false,
        });

        const content = await storage.read(uri);

        expect(content.uri).toBe(uri);
        expect(content.mimeType).toBe('image/png');
        expect(content.blob).toBe(testBase64);
      });

      it('should throw error for non-existent resource', async () => {
        await expect(storage.read('file:///nonexistent.png')).rejects.toThrow('Resource not found');
      });
    });

    describe('list', () => {
      it('should return empty list when no screenshots', async () => {
        const resources = await storage.list();
        expect(resources).toHaveLength(0);
      });

      it('should list saved screenshots', async () => {
        await storage.write(testBase64, {
          pageUrl: 'https://example1.com',
          fullPage: false,
        });

        // Add small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        await storage.write(testBase64, {
          pageUrl: 'https://example2.com',
          fullPage: true,
        });

        const resources = await storage.list();

        expect(resources).toHaveLength(2);
        expect(resources[0].mimeType).toBe('image/png');
        expect(resources[0].uri).toMatch(/^file:\/\//);
      });

      it('should sort by timestamp descending', async () => {
        await storage.write(testBase64, {
          pageUrl: 'https://first.com',
          fullPage: false,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        await storage.write(testBase64, {
          pageUrl: 'https://second.com',
          fullPage: false,
        });

        const resources = await storage.list();

        expect(resources[0].metadata.pageUrl).toBe('https://second.com');
        expect(resources[1].metadata.pageUrl).toBe('https://first.com');
      });
    });

    describe('exists', () => {
      it('should return true for existing resource', async () => {
        const uri = await storage.write(testBase64, { fullPage: false });
        expect(await storage.exists(uri)).toBe(true);
      });

      it('should return false for non-existent resource', async () => {
        expect(await storage.exists('file:///nonexistent.png')).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete a screenshot and its metadata', async () => {
        const uri = await storage.write(testBase64, { fullPage: false });

        await storage.delete(uri);

        expect(await storage.exists(uri)).toBe(false);
      });

      it('should throw error when deleting non-existent resource', async () => {
        await expect(storage.delete('file:///nonexistent.png')).rejects.toThrow(
          'Resource not found'
        );
      });
    });
  });

  describe('ScreenshotStorageFactory', () => {
    beforeEach(() => {
      ScreenshotStorageFactory.reset();
    });

    afterEach(() => {
      delete process.env.SCREENSHOT_STORAGE_PATH;
      ScreenshotStorageFactory.reset();
    });

    it('should create storage with custom path from env', async () => {
      process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;
      const storage = await ScreenshotStorageFactory.create();

      const testBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const uri = await storage.write(testBase64, { fullPage: false });

      expect(uri).toContain(testStoragePath);
    });

    it('should reuse same storage instance', async () => {
      process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;
      const storage1 = await ScreenshotStorageFactory.create();
      const storage2 = await ScreenshotStorageFactory.create();

      expect(storage1).toBe(storage2);
    });
  });
});
