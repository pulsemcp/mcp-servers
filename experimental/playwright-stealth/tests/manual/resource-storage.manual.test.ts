import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaywrightClient } from '../../shared/src/server.js';
import {
  FileSystemScreenshotStorage,
  ScreenshotStorageFactory,
} from '../../shared/src/storage/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Manual tests for Screenshot Resource Storage
 *
 * These tests verify that screenshot storage works correctly with real browsers.
 * Run with: npm run test:manual
 */

describe('Screenshot Resource Storage Manual Tests', () => {
  let client: PlaywrightClient | null = null;
  let testStoragePath: string;
  let storage: FileSystemScreenshotStorage;

  beforeAll(async () => {
    // Create a unique test storage directory
    testStoragePath = path.join(os.tmpdir(), `playwright-storage-manual-${Date.now()}`);
    process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;

    // Reset and create storage
    ScreenshotStorageFactory.reset();
    storage = new FileSystemScreenshotStorage(testStoragePath);
    await storage.init();

    // Create client and navigate to a page
    client = new PlaywrightClient({
      stealthMode: false,
      headless: true,
      timeout: 30000,
    });

    await client.execute(`
      await page.goto('https://example.com');
    `);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    // Clean up test storage directory
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.SCREENSHOT_STORAGE_PATH;
    ScreenshotStorageFactory.reset();
  });

  describe('FileSystemScreenshotStorage with Real Screenshots', () => {
    it('should save a real screenshot to storage', async () => {
      // Take a real screenshot
      const base64 = await client!.screenshot();
      expect(base64).toBeDefined();
      expect(base64.length).toBeGreaterThan(1000); // Real screenshots are much larger than test data

      // Get page state for metadata
      const state = await client!.getState();

      // Save to storage
      const uri = await storage.write(base64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      console.log('Screenshot saved to:', uri);

      // Verify URI format
      expect(uri).toMatch(/^file:\/\//);
      expect(uri).toContain('.png');

      // Verify file exists on disk
      const filePath = uri.replace('file://', '');
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file size is reasonable (real PNG)
      const stats = await fs.stat(filePath);
      expect(stats.size).toBeGreaterThan(1000);
      console.log('Screenshot file size:', stats.size, 'bytes');
    });

    it('should save a full-page screenshot to storage', async () => {
      // Take a full-page screenshot
      const base64 = await client!.screenshot({ fullPage: true });
      expect(base64).toBeDefined();

      const state = await client!.getState();

      const uri = await storage.write(base64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: true,
      });

      console.log('Full-page screenshot saved to:', uri);

      // Verify metadata file contains fullPage: true
      const metadataPath = uri.replace('file://', '').replace('.png', '.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(metadata.fullPage).toBe(true);
      expect(metadata.pageUrl).toContain('example.com');
      expect(metadata.pageTitle).toBe('Example Domain');
      console.log('Screenshot metadata:', metadata);
    });

    it('should read back a saved screenshot', async () => {
      // Take and save a screenshot
      const originalBase64 = await client!.screenshot();
      const state = await client!.getState();

      const uri = await storage.write(originalBase64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      // Read it back
      const content = await storage.read(uri);

      expect(content.uri).toBe(uri);
      expect(content.mimeType).toBe('image/png');
      expect(content.blob).toBe(originalBase64);
      console.log('Successfully read back screenshot, blob length:', content.blob.length);
    });

    it('should list saved screenshots', async () => {
      // Take multiple screenshots with delay to ensure different timestamps
      const state = await client!.getState();

      const screenshot1 = await client!.screenshot();
      await storage.write(screenshot1, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const screenshot2 = await client!.screenshot({ fullPage: true });
      await storage.write(screenshot2, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: true,
      });

      // List all screenshots
      const resources = await storage.list();

      console.log('Listed', resources.length, 'screenshots');
      expect(resources.length).toBeGreaterThanOrEqual(2);

      // Verify resource structure
      for (const resource of resources) {
        expect(resource.uri).toMatch(/^file:\/\//);
        expect(resource.mimeType).toBe('image/png');
        expect(resource.metadata.timestamp).toBeDefined();
        console.log('  -', resource.name, '| fullPage:', resource.metadata.fullPage);
      }

      // Verify sorted by timestamp descending (most recent first)
      if (resources.length >= 2) {
        const time0 = new Date(resources[0].metadata.timestamp).getTime();
        const time1 = new Date(resources[1].metadata.timestamp).getTime();
        expect(time0).toBeGreaterThanOrEqual(time1);
      }
    });

    it('should delete a screenshot', async () => {
      // Take and save a screenshot
      const base64 = await client!.screenshot();
      const state = await client!.getState();

      const uri = await storage.write(base64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      // Verify it exists
      expect(await storage.exists(uri)).toBe(true);

      // Delete it
      await storage.delete(uri);

      // Verify it's gone
      expect(await storage.exists(uri)).toBe(false);
      console.log('Successfully deleted screenshot:', uri);
    });
  });

  describe('Storage Factory with Environment Variable', () => {
    it('should use SCREENSHOT_STORAGE_PATH environment variable', async () => {
      // Factory should use the env var we set in beforeAll
      const factoryStorage = await ScreenshotStorageFactory.create();

      const base64 = await client!.screenshot();
      const state = await client!.getState();

      const uri = await factoryStorage.write(base64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      // Verify it used our test storage path
      expect(uri).toContain(testStoragePath);
      console.log('Factory storage path verified:', uri);
    });
  });

  describe('Screenshot on Different Pages', () => {
    it('should capture screenshot after navigation', async () => {
      // Navigate to a different page
      await client!.execute(`
        await page.goto('https://httpbin.org/html');
      `);

      const base64 = await client!.screenshot();
      const state = await client!.getState();

      const uri = await storage.write(base64, {
        pageUrl: state.currentUrl,
        pageTitle: state.title,
        fullPage: false,
      });

      // Read metadata
      const metadataPath = uri.replace('file://', '').replace('.png', '.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      expect(metadata.pageUrl).toContain('httpbin.org');
      console.log('Captured screenshot of httpbin.org, metadata:', metadata);
    });
  });
});
