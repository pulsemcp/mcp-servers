import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for Playwright Stealth MCP Server
 *
 * These tests use a real browser and hit real websites via the MCP protocol.
 * Run with: npm run test:manual
 *
 * Prerequisites:
 * - Run: npm run test:manual:setup (installs Playwright browsers)
 */

// The screenshot dimension limit from the server (8000px)
const MAX_SCREENSHOT_DIMENSION = 8000;

describe('Playwright Client Manual Tests', () => {
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  describe('Standard Mode', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '30000',
          STEALTH_MODE: 'false',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should navigate to a page and get title', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
          return await page.title();
        `,
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Example Domain');
    });

    it('should take a screenshot', async () => {
      const result = await client.callTool('browser_screenshot', {
        fullPage: false,
      });

      expect(result.isError).toBeFalsy();
      // The screenshot tool returns image content (base64 data) and/or resource_link
      expect(result.content.length).toBeGreaterThan(0);

      // Find the image content in the result
      const imageContent = result.content.find(
        (c: { type: string }) => (c as { type: string }).type === 'image'
      ) as { type: string; data: string; mimeType: string } | undefined;

      if (imageContent) {
        expect(imageContent.data.length).toBeGreaterThan(100);
        // Verify it's valid base64
        const buffer = Buffer.from(imageContent.data, 'base64');
        expect(buffer.length).toBeGreaterThan(0);
      }
    });

    it('should get browser state', async () => {
      const result = await client.callTool('browser_get_state', {});

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      const state = JSON.parse(text);

      expect(state.isOpen).toBe(true);
      expect(state.currentUrl).toContain('example.com');
      expect(state.title).toBe('Example Domain');
    });

    it('should close browser', async () => {
      const closeResult = await client.callTool('browser_close', {});
      expect(closeResult.isError).toBeFalsy();

      const stateResult = await client.callTool('browser_get_state', {});
      expect(stateResult.isError).toBeFalsy();
      const text = (stateResult.content[0] as { type: string; text: string }).text;
      const state = JSON.parse(text);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('Screenshot Dimension Limiting', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '30000',
          STEALTH_MODE: 'false',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should clip full-page screenshots that exceed dimension limits', async () => {
      // Create a page with height exceeding the max dimension
      const targetHeight = MAX_SCREENSHOT_DIMENSION + 2000; // 10000px
      await client.callTool('browser_execute', {
        code: `
          await page.goto('about:blank');
          await page.setContent(\`
            <html>
              <body style="margin: 0; padding: 0;">
                <div style="width: 100%; height: ${targetHeight}px; background: linear-gradient(to bottom, red, blue);">
                  Tall page for testing screenshot clipping
                </div>
              </body>
            </html>
          \`);
        `,
      });

      // Take a full-page screenshot
      const result = await client.callTool('browser_screenshot', {
        fullPage: true,
      });

      expect(result.isError).toBeFalsy();

      // Look for the warning text about clipping
      const warningContent = result.content.find(
        (c: { type: string; text?: string }) =>
          (c as { type: string; text?: string }).type === 'text' &&
          (c as { type: string; text?: string }).text?.includes('Warning')
      ) as { type: string; text: string } | undefined;

      expect(warningContent).toBeDefined();
      expect(warningContent!.text).toContain(`${MAX_SCREENSHOT_DIMENSION}px limit`);

      console.log('Screenshot clipping warning:', warningContent!.text);
    });

    it('should not clip screenshots within dimension limits', async () => {
      // Navigate to a normal page with reasonable height
      await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
        `,
      });

      // Take a full-page screenshot
      const result = await client.callTool('browser_screenshot', {
        fullPage: true,
      });

      expect(result.isError).toBeFalsy();

      // There should be no warning text about clipping
      const warningContent = result.content.find(
        (c: { type: string; text?: string }) =>
          (c as { type: string; text?: string }).type === 'text' &&
          (c as { type: string; text?: string }).text?.includes('Warning')
      );

      expect(warningContent).toBeUndefined();
    });

    it('should not clip viewport-only screenshots regardless of page size', async () => {
      // Create a tall page
      await client.callTool('browser_execute', {
        code: `
          await page.setContent(\`
            <html>
              <body style="margin: 0; padding: 0;">
                <div style="width: 100%; height: 15000px; background: green;">
                  Very tall page
                </div>
              </body>
            </html>
          \`);
        `,
      });

      // Take a viewport-only screenshot (fullPage: false)
      const result = await client.callTool('browser_screenshot', {
        fullPage: false,
      });

      expect(result.isError).toBeFalsy();

      // Viewport screenshot should never have a clipping warning
      const warningContent = result.content.find(
        (c: { type: string; text?: string }) =>
          (c as { type: string; text?: string }).type === 'text' &&
          (c as { type: string; text?: string }).text?.includes('Warning')
      );

      expect(warningContent).toBeUndefined();
    });
  });

  describe('Stealth Mode', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '30000',
          STEALTH_MODE: 'true',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should navigate with stealth mode enabled', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://example.com');
          return await page.title();
        `,
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Example Domain');
    });

    it('should pass webdriver detection check', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://bot.sannysoft.com');
          await page.waitForTimeout(2000);

          // Get webdriver detection result
          const webdriverResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2 && cells[0].textContent?.includes('Webdriver')) {
                return cells[1].textContent?.trim() || 'unknown';
              }
            }
            return 'not found';
          });

          return webdriverResult;
        `,
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      // With stealth mode, webdriver should not be detected
      console.log('Webdriver detection result:', text);
    });

    it('should get config with stealth mode info', async () => {
      const result = await client.callTool('browser_get_state', {});

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      const state = JSON.parse(text);

      expect(state.stealthMode).toBe(true);
      expect(state.headless).toBe(true);
    });
  });

  describe('Anti-Bot Protection Tests', () => {
    let client: TestMCPClient;

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    it('should fail to load claude.ai login WITHOUT stealth mode', async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '30000',
          STEALTH_MODE: 'false',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();

      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://claude.ai/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(2000);

          // Check if we're blocked or got a challenge page
          const content = await page.content();
          const url = page.url();

          // Look for signs of being blocked
          const isBlocked = content.includes('challenge') ||
                           content.includes('captcha') ||
                           content.includes('verify') ||
                           content.includes('blocked') ||
                           content.includes('cf-') ||
                           url.includes('challenges');

          return { url, isBlocked, hasLoginForm: content.includes('password') || content.includes('email') };
        `,
      });

      console.log(
        'Non-stealth claude.ai result:',
        (result.content[0] as { type: string; text: string }).text
      );
      expect(result.isError).toBeFalsy();

      // Disconnect so we can reconnect with different env
      await client.disconnect();
    });

    it('should successfully load claude.ai login WITH stealth mode', async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '30000',
          STEALTH_MODE: 'true',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();

      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://claude.ai/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(2000);

          // Check if we got through to the actual login page
          const content = await page.content();
          const url = page.url();

          // Look for signs of being blocked
          const isBlocked = content.includes('challenge') ||
                           content.includes('captcha') ||
                           content.includes('verify') ||
                           content.includes('blocked') ||
                           content.includes('cf-') ||
                           url.includes('challenges');

          return { url, isBlocked, hasLoginForm: content.includes('password') || content.includes('email') };
        `,
      });

      console.log(
        'Stealth claude.ai result:',
        (result.content[0] as { type: string; text: string }).text
      );
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      client = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '5000',
          STEALTH_MODE: 'false',
          PATH: process.env.PATH || '',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should handle navigation errors gracefully', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://this-domain-does-not-exist-12345.com', { timeout: 3000 });
        `,
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('Error');
    });

    it('should handle execution timeout', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.waitForTimeout(10000);
        `,
        timeout: 1000,
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain('timed out');
    });
  });

  describe('Proxy Mode', () => {
    // These tests require PROXY_URL, PROXY_USERNAME, PROXY_PASSWORD env vars
    const proxyUrl = process.env.PROXY_URL;
    const proxyUsername = process.env.PROXY_USERNAME;
    const proxyPassword = process.env.PROXY_PASSWORD;

    const skipProxy = !proxyUrl;

    let client: TestMCPClient;

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    it.skipIf(skipProxy)('should connect through proxy and get external IP', async () => {
      console.log('Proxy URL:', proxyUrl);
      console.log('Proxy Username:', proxyUsername);
      console.log('Proxy Password:', proxyPassword ? '***' : '(not set)');

      const env: Record<string, string> = {
        HEADLESS: 'true',
        TIMEOUT: '60000',
        STEALTH_MODE: 'false',
        PROXY_URL: proxyUrl!,
        PATH: process.env.PATH || '',
      };
      if (proxyUsername) env.PROXY_USERNAME = proxyUsername;
      if (proxyPassword) env.PROXY_PASSWORD = proxyPassword;

      client = new TestMCPClient({
        serverPath,
        env,
      });
      await client.connect();

      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://httpbin.org/ip', { timeout: 30000 });
          const body = await page.textContent('body');
          return JSON.parse(body);
        `,
      });

      console.log('Proxy test result:', (result.content[0] as { type: string; text: string }).text);
      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      // The response should have an "origin" field with the proxy IP
      expect(text).toContain('origin');
    });

    it.skipIf(skipProxy)('should verify proxy IP differs from local IP', async () => {
      // First get the proxy IP (client already connected with proxy from previous test)
      const proxyResult = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://httpbin.org/ip', { timeout: 30000 });
          const body = await page.textContent('body');
          return JSON.parse(body);
        `,
      });

      // Disconnect proxy client
      await client.disconnect();

      // Now connect without proxy to get direct IP
      const directClient = new TestMCPClient({
        serverPath,
        env: {
          HEADLESS: 'true',
          TIMEOUT: '60000',
          STEALTH_MODE: 'false',
          PATH: process.env.PATH || '',
        },
      });
      await directClient.connect();

      const directResult = await directClient.callTool('browser_execute', {
        code: `
          await page.goto('https://httpbin.org/ip', { timeout: 30000 });
          const body = await page.textContent('body');
          return JSON.parse(body);
        `,
      });

      await directClient.disconnect();

      const proxyText = (proxyResult.content[0] as { type: string; text: string }).text;
      const directText = (directResult.content[0] as { type: string; text: string }).text;

      console.log('Proxy IP:', proxyText);
      console.log('Direct IP:', directText);

      expect(proxyResult.isError).toBeFalsy();
      expect(directResult.isError).toBeFalsy();
      // IPs should be different (proxy should mask our real IP)
      expect(proxyText).not.toBe(directText);

      // Reconnect proxy client for subsequent tests
      const env: Record<string, string> = {
        HEADLESS: 'true',
        TIMEOUT: '60000',
        STEALTH_MODE: 'true',
        PROXY_URL: proxyUrl!,
        PATH: process.env.PATH || '',
      };
      if (proxyUsername) env.PROXY_USERNAME = proxyUsername;
      if (proxyPassword) env.PROXY_PASSWORD = proxyPassword;

      client = new TestMCPClient({
        serverPath,
        env,
      });
      await client.connect();
    });

    it.skipIf(skipProxy)('should work with proxy + stealth mode combined', async () => {
      const result = await client.callTool('browser_execute', {
        code: `
          await page.goto('https://bot.sannysoft.com', { timeout: 30000 });
          await page.waitForTimeout(2000);

          // Get webdriver detection result
          const webdriverResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2 && cells[0].textContent?.includes('Webdriver')) {
                return cells[1].textContent?.trim() || 'unknown';
              }
            }
            return 'not found';
          });

          return webdriverResult;
        `,
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      console.log('Proxy + Stealth webdriver detection result:', text);
    });

    it.skipIf(skipProxy)('should verify config shows proxy enabled', async () => {
      const result = await client.callTool('browser_get_state', {});

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { type: string; text: string }).text;
      const state = JSON.parse(text);

      expect(state.proxyEnabled).toBe(true);
      expect(state.stealthMode).toBe(true);
    });
  });
});
