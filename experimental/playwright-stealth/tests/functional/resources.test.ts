import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from '../../shared/src/resources.js';
import { ScreenshotStorageFactory } from '../../shared/src/storage/index.js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Screenshot Resources', () => {
  let server: Server;
  let testStoragePath: string;

  // Sample base64-encoded 1x1 red PNG
  const testBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  type ResourcesListHandler = (req: { method: string; params: unknown }) => Promise<{
    resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }>;
  }>;

  type ResourcesReadHandler = (req: { method: string; params: { uri: string } }) => Promise<{
    contents: Array<{ uri: string; mimeType?: string; blob?: string }>;
  }>;

  beforeEach(async () => {
    // Create a unique test storage directory
    testStoragePath = path.join(os.tmpdir(), `playwright-resources-test-${Date.now()}`);
    process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;

    // Reset the storage factory
    ScreenshotStorageFactory.reset();

    // Create server and register resources
    server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { resources: {} } });
    registerResources(server);
  });

  afterEach(async () => {
    // Clean up test storage directory
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.SCREENSHOT_STORAGE_PATH;
    ScreenshotStorageFactory.reset();
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
    it('should return empty list when no screenshots', async () => {
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
