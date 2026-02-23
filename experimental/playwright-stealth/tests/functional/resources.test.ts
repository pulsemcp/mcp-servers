import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from '../../shared/src/resources.js';
import { ScreenshotStorageFactory, VideoStorageFactory } from '../../shared/src/storage/index.js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Screenshot and Video Resources', () => {
  let server: Server;
  let testStoragePath: string;
  let testVideoStoragePath: string;

  // Sample base64-encoded 1x1 red PNG
  const testBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  type ResourcesListHandler = (req: { method: string; params: unknown }) => Promise<{
    resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }>;
  }>;

  type ResourcesReadHandler = (req: { method: string; params: { uri: string } }) => Promise<{
    contents: Array<{ uri: string; mimeType?: string; blob?: string }>;
  }>;

  // Helper to create a mock video file
  async function createMockVideoFile(): Promise<string> {
    const mockVideoDir = path.join(os.tmpdir(), `mock-video-res-${Date.now()}`);
    await fs.mkdir(mockVideoDir, { recursive: true });
    const mockVideoPath = path.join(mockVideoDir, 'test-video.webm');
    await fs.writeFile(mockVideoPath, 'mock-webm-video-data');
    return mockVideoPath;
  }

  beforeEach(async () => {
    // Create unique test storage directories
    testStoragePath = path.join(os.tmpdir(), `playwright-resources-test-${Date.now()}`);
    testVideoStoragePath = path.join(os.tmpdir(), `playwright-video-resources-test-${Date.now()}`);
    process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;
    process.env.VIDEO_STORAGE_PATH = testVideoStoragePath;

    // Reset the storage factories
    ScreenshotStorageFactory.reset();
    VideoStorageFactory.reset();

    // Create server and register resources
    server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { resources: {} } });
    registerResources(server);
  });

  afterEach(async () => {
    // Clean up test storage directories
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    try {
      await fs.rm(testVideoStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.SCREENSHOT_STORAGE_PATH;
    delete process.env.VIDEO_STORAGE_PATH;
    ScreenshotStorageFactory.reset();
    VideoStorageFactory.reset();
  });

  const getListResourcesHandler = (): ResourcesListHandler => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (server as any)._requestHandlers;
    return handlers.get('resources/list');
  };

  const getReadResourceHandler = (): ResourcesReadHandler => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (server as any)._requestHandlers;
    return handlers.get('resources/read');
  };

  describe('resources/list', () => {
    it('should return empty list when no screenshots or videos', async () => {
      const handler = getListResourcesHandler();
      const result = await handler({ method: 'resources/list', params: {} });

      expect(result.resources).toHaveLength(0);
    });

    it('should list saved screenshots', async () => {
      // Save a screenshot first
      const storage = await ScreenshotStorageFactory.create();
      await storage.write(testBase64, {
        pageUrl: 'https://example.com',
        pageTitle: 'Example',
        fullPage: false,
      });

      const handler = getListResourcesHandler();
      const result = await handler({ method: 'resources/list', params: {} });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toMatch(/^file:\/\//);
      expect(result.resources[0].mimeType).toBe('image/png');
      expect(result.resources[0].description).toContain('https://example.com');
    });

    it('should list saved videos', async () => {
      const videoStorage = await VideoStorageFactory.create();
      const mockVideoPath = await createMockVideoFile();
      await videoStorage.write(mockVideoPath, {
        pageUrl: 'https://example.com/video',
      });

      const handler = getListResourcesHandler();
      const result = await handler({ method: 'resources/list', params: {} });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toMatch(/^file:\/\//);
      expect(result.resources[0].mimeType).toBe('video/webm');
      expect(result.resources[0].description).toContain('https://example.com/video');
    });

    it('should list both screenshots and videos', async () => {
      // Save a screenshot
      const screenshotStorage = await ScreenshotStorageFactory.create();
      await screenshotStorage.write(testBase64, {
        pageUrl: 'https://example.com/screenshot',
        fullPage: false,
      });

      // Save a video
      const videoStorage = await VideoStorageFactory.create();
      const mockVideoPath = await createMockVideoFile();
      await videoStorage.write(mockVideoPath, {
        pageUrl: 'https://example.com/video',
      });

      const handler = getListResourcesHandler();
      const result = await handler({ method: 'resources/list', params: {} });

      expect(result.resources).toHaveLength(2);
      const mimeTypes = result.resources.map((r) => r.mimeType);
      expect(mimeTypes).toContain('image/png');
      expect(mimeTypes).toContain('video/webm');
    });
  });

  describe('resources/read', () => {
    it('should read a saved screenshot', async () => {
      // Save a screenshot first
      const storage = await ScreenshotStorageFactory.create();
      const uri = await storage.write(testBase64, {
        pageUrl: 'https://example.com',
        fullPage: false,
      });

      const handler = getReadResourceHandler();
      const result = await handler({
        method: 'resources/read',
        params: { uri },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(uri);
      expect(result.contents[0].mimeType).toBe('image/png');
      expect(result.contents[0].blob).toBe(testBase64);
    });

    it('should read a saved video', async () => {
      const videoStorage = await VideoStorageFactory.create();
      const mockVideoPath = await createMockVideoFile();
      const uri = await videoStorage.write(mockVideoPath, {
        pageUrl: 'https://example.com/video',
      });

      const handler = getReadResourceHandler();
      const result = await handler({
        method: 'resources/read',
        params: { uri },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(uri);
      expect(result.contents[0].mimeType).toBe('video/webm');
      expect(result.contents[0].blob).toBeDefined();
    });

    it('should throw error for non-existent resource', async () => {
      const handler = getReadResourceHandler();

      await expect(
        handler({
          method: 'resources/read',
          params: { uri: 'file:///nonexistent.png' },
        })
      ).rejects.toThrow('Resource not found');
    });
  });
});
