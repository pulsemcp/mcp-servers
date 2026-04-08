import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemVideoStorage } from '../../shared/src/storage/video-filesystem.js';
import { VideoStorageFactory } from '../../shared/src/storage/video-factory.js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Video Storage', () => {
  let testStoragePath: string;
  let storage: FileSystemVideoStorage;

  beforeEach(async () => {
    // Create a unique test storage directory
    testStoragePath = path.join(os.tmpdir(), `playwright-video-storage-test-${Date.now()}`);
    storage = new FileSystemVideoStorage(testStoragePath);
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

  // Helper to create a mock video file and return its path
  async function createMockVideoFile(): Promise<string> {
    const mockVideoDir = path.join(os.tmpdir(), `mock-video-src-${Date.now()}`);
    await fs.mkdir(mockVideoDir, { recursive: true });
    const mockVideoPath = path.join(mockVideoDir, 'test-video.webm');
    await fs.writeFile(mockVideoPath, 'mock-webm-video-data');
    return mockVideoPath;
  }

  describe('FileSystemVideoStorage', () => {
    describe('write', () => {
      it('should save a video and return file URI', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {
          pageUrl: 'https://example.com',
          pageTitle: 'Example',
        });

        expect(uri).toMatch(/^file:\/\//);
        expect(uri).toContain('.webm');
      });

      it('should create both WebM and JSON metadata files', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {
          pageUrl: 'https://example.com',
        });

        const webmPath = uri.replace('file://', '');
        const jsonPath = webmPath.replace('.webm', '.json');

        const webmExists = await fs
          .access(webmPath)
          .then(() => true)
          .catch(() => false);
        const jsonExists = await fs
          .access(jsonPath)
          .then(() => true)
          .catch(() => false);

        expect(webmExists).toBe(true);
        expect(jsonExists).toBe(true);
      });

      it('should save correct metadata', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {
          pageUrl: 'https://example.com',
          pageTitle: 'Example Title',
          durationMs: 5000,
        });

        const jsonPath = uri.replace('file://', '').replace('.webm', '.json');
        const metadata = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

        expect(metadata.pageUrl).toBe('https://example.com');
        expect(metadata.pageTitle).toBe('Example Title');
        expect(metadata.durationMs).toBe(5000);
        expect(metadata.timestamp).toBeDefined();
      });

      it('should copy the video file content correctly', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {});

        const webmPath = uri.replace('file://', '');
        const content = await fs.readFile(webmPath, 'utf-8');
        expect(content).toBe('mock-webm-video-data');
      });
    });

    describe('read', () => {
      it('should read a saved video', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {});

        const content = await storage.read(uri);

        expect(content.uri).toBe(uri);
        expect(content.mimeType).toBe('video/webm');
        expect(content.blob).toBeDefined();
        // Verify it's base64 encoded
        const decoded = Buffer.from(content.blob, 'base64').toString('utf-8');
        expect(decoded).toBe('mock-webm-video-data');
      });

      it('should throw error for non-existent resource', async () => {
        await expect(storage.read('file:///nonexistent.webm')).rejects.toThrow(
          'Resource not found'
        );
      });
    });

    describe('list', () => {
      it('should return empty list when no videos', async () => {
        const resources = await storage.list();
        expect(resources).toHaveLength(0);
      });

      it('should list saved videos', async () => {
        const mockVideoPath1 = await createMockVideoFile();
        await storage.write(mockVideoPath1, {
          pageUrl: 'https://example1.com',
        });

        // Add small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        const mockVideoPath2 = await createMockVideoFile();
        await storage.write(mockVideoPath2, {
          pageUrl: 'https://example2.com',
        });

        const resources = await storage.list();

        expect(resources).toHaveLength(2);
        expect(resources[0].mimeType).toBe('video/webm');
        expect(resources[0].uri).toMatch(/^file:\/\//);
      });

      it('should sort by timestamp descending', async () => {
        const mockVideoPath1 = await createMockVideoFile();
        await storage.write(mockVideoPath1, {
          pageUrl: 'https://first.com',
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const mockVideoPath2 = await createMockVideoFile();
        await storage.write(mockVideoPath2, {
          pageUrl: 'https://second.com',
        });

        const resources = await storage.list();

        expect(resources[0].metadata.pageUrl).toBe('https://second.com');
        expect(resources[1].metadata.pageUrl).toBe('https://first.com');
      });
    });

    describe('exists', () => {
      it('should return true for existing resource', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {});
        expect(await storage.exists(uri)).toBe(true);
      });

      it('should return false for non-existent resource', async () => {
        expect(await storage.exists('file:///nonexistent.webm')).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete a video and its metadata', async () => {
        const mockVideoPath = await createMockVideoFile();
        const uri = await storage.write(mockVideoPath, {});

        await storage.delete(uri);

        expect(await storage.exists(uri)).toBe(false);
      });

      it('should throw error when deleting non-existent resource', async () => {
        await expect(storage.delete('file:///nonexistent.webm')).rejects.toThrow(
          'Resource not found'
        );
      });
    });
  });

  describe('VideoStorageFactory', () => {
    beforeEach(() => {
      VideoStorageFactory.reset();
    });

    afterEach(() => {
      delete process.env.VIDEO_STORAGE_PATH;
      VideoStorageFactory.reset();
    });

    it('should create storage with custom path from env', async () => {
      process.env.VIDEO_STORAGE_PATH = testStoragePath;
      const factoryStorage = await VideoStorageFactory.create();

      const mockVideoPath = await createMockVideoFile();
      const uri = await factoryStorage.write(mockVideoPath, {});

      expect(uri).toContain(testStoragePath);
    });

    it('should reuse same storage instance', async () => {
      process.env.VIDEO_STORAGE_PATH = testStoragePath;
      const storage1 = await VideoStorageFactory.create();
      const storage2 = await VideoStorageFactory.create();

      expect(storage1).toBe(storage2);
    });
  });
});
