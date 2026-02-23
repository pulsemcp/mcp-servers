import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for Video Recording via MCP protocol
 *
 * These tests verify that video recording (start/stop) works correctly through
 * the MCP server layer using real browser context recycling.
 * Run with: npm run test:manual
 */

describe('Video Recording Manual Tests', () => {
  let client: TestMCPClient;
  let testVideoStoragePath: string;
  let testScreenshotStoragePath: string;
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  beforeAll(async () => {
    // Create unique test storage directory paths
    testVideoStoragePath = path.join(os.tmpdir(), `playwright-video-manual-${Date.now()}`);
    testScreenshotStoragePath = path.join(
      os.tmpdir(),
      `playwright-screenshot-manual-${Date.now()}`
    );

    client = new TestMCPClient({
      serverPath,
      env: {
        HEADLESS: 'true',
        TIMEOUT: '30000',
        STEALTH_MODE: 'false',
        VIDEO_STORAGE_PATH: testVideoStoragePath,
        SCREENSHOT_STORAGE_PATH: testScreenshotStoragePath,
        PATH: process.env.PATH || '',
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Start and Stop Recording', () => {
    it('should start recording successfully', async () => {
      // First navigate to a page
      await client.callTool('browser_execute', {
        code: `await page.goto('https://example.com');`,
      });

      // Start recording
      const result = await client.callTool('browser_start_recording', {});

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Recording started');
      expect(text).toContain('example.com');
      console.log('Start recording result:', text);
    });

    it('should be able to perform actions while recording', async () => {
      // Navigate to a page while recording
      const navResult = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
          return await page.title();
        `,
      });

      expect(navResult.isError).toBeFalsy();
      const text = (navResult.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Example Domain');
      console.log('Navigation during recording:', text);
    });

    it('should stop recording and return video resource link', async () => {
      // Perform some actions that get recorded
      await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
          await page.waitForTimeout(500);
        `,
      });

      // Stop recording
      const result = await client.callTool('browser_stop_recording', {});

      expect(result.isError).toBeFalsy();
      expect(result.content.length).toBe(2);

      // First content should be text confirmation
      const textContent = result.content[0] as { type: string; text: string };
      expect(textContent.type).toBe('text');
      expect(textContent.text).toContain('Recording stopped and saved');
      console.log('Stop recording text:', textContent.text);

      // Second content should be resource_link
      const resourceLink = result.content[1] as {
        type: string;
        uri: string;
        name: string;
        mimeType: string;
      };
      expect(resourceLink.type).toBe('resource_link');
      expect(resourceLink.uri).toMatch(/^file:\/\//);
      expect(resourceLink.uri).toContain('.webm');
      expect(resourceLink.mimeType).toBe('video/webm');
      console.log('Video saved to:', resourceLink.uri);
    });

    it('should error when stopping recording while not recording', async () => {
      const result = await client.callTool('browser_stop_recording', {});

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Not currently recording');
      console.log('Expected error:', text);
    });

    it('should be able to execute after stopping recording', async () => {
      // Verify the browser still works after stopping recording
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
          return await page.title();
        `,
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Example Domain');
      console.log('Post-recording execution:', text);
    });
  });

  describe('Video Resources', () => {
    it('should list video recordings as resources', async () => {
      const resources = await client.listResources();

      // Should have at least the video from the previous test
      const videoResources = resources.resources.filter(
        (r: { mimeType?: string }) => r.mimeType === 'video/webm'
      );

      console.log('Found', videoResources.length, 'video resources');
      expect(videoResources.length).toBeGreaterThanOrEqual(1);

      for (const resource of videoResources) {
        expect(resource.uri).toMatch(/^file:\/\//);
        expect(resource.uri).toContain('.webm');
        console.log('  -', resource.name, ':', resource.uri);
      }
    });

    it('should read back a saved video resource', async () => {
      const resources = await client.listResources();
      const videoResource = resources.resources.find(
        (r: { mimeType?: string }) => r.mimeType === 'video/webm'
      );

      expect(videoResource).toBeDefined();

      const readResult = await client.readResource(videoResource!.uri);

      expect(readResult.contents.length).toBeGreaterThan(0);
      const content = readResult.contents[0] as {
        uri: string;
        mimeType: string;
        blob: string;
      };

      expect(content.uri).toBe(videoResource!.uri);
      expect(content.mimeType).toBe('video/webm');
      expect(content.blob.length).toBeGreaterThan(100);
      console.log('Video blob length:', content.blob.length, 'chars (base64)');
    });
  });

  describe('Recording While Already Recording', () => {
    it('should save previous recording when starting a new one while recording', async () => {
      // Navigate to a page
      await client.callTool('browser_execute', {
        code: `await page.goto('https://example.com');`,
      });

      // Start first recording
      const startResult1 = await client.callTool('browser_start_recording', {});
      expect(startResult1.isError).toBeFalsy();
      console.log('First recording started');

      // Perform an action
      await client.callTool('browser_execute', {
        code: `await page.waitForTimeout(500);`,
      });

      // Start a second recording (should stop and save the first)
      const startResult2 = await client.callTool('browser_start_recording', {});
      expect(startResult2.isError).toBeFalsy();
      const text = (startResult2.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Previous recording saved');
      console.log('Second recording started, previous saved:', text);

      // Clean up: stop the second recording
      await client.callTool('browser_execute', {
        code: `await page.goto('https://example.com');`,
      });
      const stopResult = await client.callTool('browser_stop_recording', {});
      expect(stopResult.isError).toBeFalsy();
      console.log('Second recording stopped');
    });
  });
});
