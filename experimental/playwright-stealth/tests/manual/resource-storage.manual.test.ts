import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for Screenshot Resource Storage via MCP protocol
 *
 * These tests verify that screenshot storage works correctly through the MCP server layer,
 * using browser_execute and browser_screenshot tools to drive screenshot capture and storage.
 * Run with: npm run test:manual
 */

describe('Screenshot Resource Storage Manual Tests', () => {
  let client: TestMCPClient;
  let testStoragePath: string;
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  beforeAll(async () => {
    // Create a unique test storage directory path
    testStoragePath = path.join(os.tmpdir(), `playwright-storage-manual-${Date.now()}`);

    client = new TestMCPClient({
      serverPath,
      env: {
        HEADLESS: 'true',
        TIMEOUT: '30000',
        STEALTH_MODE: 'false',
        SCREENSHOT_STORAGE_PATH: testStoragePath,
        PATH: process.env.PATH || '',
      },
    });
    await client.connect();

    // Navigate to a page so screenshots have content
    await client.callTool('browser_execute', {
      code: `
        await page.goto('https://example.com');
      `,
    });
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Screenshot Capture and Storage via MCP', () => {
    it('should take a viewport screenshot and return image data', async () => {
      const result = await client.callTool('browser_screenshot', {
        fullPage: false,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content.length).toBeGreaterThan(0);

      // Find the image content
      const imageContent = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'image'
      ) as { type: string; data: string; mimeType: string } | undefined;

      expect(imageContent).toBeDefined();
      expect(imageContent!.mimeType).toBe('image/png');
      expect(imageContent!.data.length).toBeGreaterThan(1000);

      // Verify it's valid base64 PNG data
      const buffer = Buffer.from(imageContent!.data, 'base64');
      expect(buffer.length).toBeGreaterThan(0);
      console.log('Screenshot data size:', imageContent!.data.length, 'chars (base64)');

      // Verify a resource_link is also returned (saved to storage)
      const resourceLink = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'resource_link'
      ) as { type: string; uri: string; name: string; mimeType: string } | undefined;

      expect(resourceLink).toBeDefined();
      expect(resourceLink!.uri).toMatch(/^file:\/\//);
      expect(resourceLink!.uri).toContain('.png');
      expect(resourceLink!.mimeType).toBe('image/png');
      console.log('Screenshot saved to:', resourceLink!.uri);
    });

    it('should take a full-page screenshot and return image data', async () => {
      const result = await client.callTool('browser_screenshot', {
        fullPage: true,
      });

      expect(result.isError).toBeFalsy();

      // Find the image content
      const imageContent = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'image'
      ) as { type: string; data: string; mimeType: string } | undefined;

      expect(imageContent).toBeDefined();
      expect(imageContent!.data.length).toBeGreaterThan(1000);

      // Verify a resource_link is returned
      const resourceLink = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'resource_link'
      ) as { type: string; uri: string } | undefined;

      expect(resourceLink).toBeDefined();
      expect(resourceLink!.uri).toMatch(/^file:\/\//);
      console.log('Full-page screenshot saved to:', resourceLink!.uri);
    });

    it('should save screenshot with saveOnly mode and return only resource link', async () => {
      const result = await client.callTool('browser_screenshot', {
        fullPage: false,
        resultHandling: 'saveOnly',
      });

      expect(result.isError).toBeFalsy();

      // In saveOnly mode, there should be no inline image data
      const imageContent = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'image'
      );
      expect(imageContent).toBeUndefined();

      // There should be a resource_link
      const resourceLink = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'resource_link'
      ) as { type: string; uri: string; name: string; description: string } | undefined;

      expect(resourceLink).toBeDefined();
      expect(resourceLink!.uri).toMatch(/^file:\/\//);
      expect(resourceLink!.uri).toContain('.png');
      console.log('saveOnly screenshot URI:', resourceLink!.uri);
    });

    it('should list saved screenshots as resources', async () => {
      // Take a couple more screenshots with delay to ensure different timestamps
      await client.callTool('browser_screenshot', { fullPage: false });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await client.callTool('browser_screenshot', { fullPage: true });

      // List resources
      const resources = await client.listResources();

      console.log('Listed', resources.resources.length, 'screenshot resources');
      expect(resources.resources.length).toBeGreaterThanOrEqual(2);

      // Verify resource structure
      for (const resource of resources.resources) {
        expect(resource.uri).toMatch(/^file:\/\//);
        expect(resource.mimeType).toBe('image/png');
        console.log('  -', resource.name);
      }
    });

    it('should read back a saved screenshot resource', async () => {
      // Take a screenshot and get its URI
      const screenshotResult = await client.callTool('browser_screenshot', {
        fullPage: false,
        resultHandling: 'saveOnly',
      });

      const resourceLink = screenshotResult.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'resource_link'
      ) as { type: string; uri: string } | undefined;

      expect(resourceLink).toBeDefined();
      const uri = resourceLink!.uri;

      // Read the resource back
      const readResult = await client.readResource(uri);

      expect(readResult.contents.length).toBeGreaterThan(0);
      const content = readResult.contents[0] as {
        uri: string;
        mimeType: string;
        blob: string;
      };

      expect(content.uri).toBe(uri);
      expect(content.mimeType).toBe('image/png');
      expect(content.blob.length).toBeGreaterThan(1000);
      console.log('Successfully read back screenshot, blob length:', content.blob.length);
    });
  });

  describe('Screenshots on Different Pages', () => {
    it('should capture screenshot after navigation to a different page', async () => {
      // Navigate to a different page
      await client.callTool('browser_execute', {
        code: `
          await page.goto('https://httpbin.org/html');
        `,
      });

      const result = await client.callTool('browser_screenshot', {
        fullPage: false,
      });

      expect(result.isError).toBeFalsy();

      // Verify image data is returned
      const imageContent = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'image'
      ) as { type: string; data: string } | undefined;

      expect(imageContent).toBeDefined();
      expect(imageContent!.data.length).toBeGreaterThan(100);

      // Verify resource link is returned
      const resourceLink = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'resource_link'
      ) as { type: string; uri: string } | undefined;

      expect(resourceLink).toBeDefined();
      console.log('Captured screenshot of httpbin.org, saved to:', resourceLink!.uri);
    });

    it('should verify browser state reflects the current page', async () => {
      const stateResult = await client.callTool('browser_get_state', {});

      expect(stateResult.isError).toBeFalsy();
      const text = (stateResult.content[0] as { type: string; text: string }).text;
      const state = JSON.parse(text);

      expect(state.isOpen).toBe(true);
      expect(state.currentUrl).toContain('httpbin.org');
      console.log('Current page URL:', state.currentUrl, '| Title:', state.title);
    });
  });
});
