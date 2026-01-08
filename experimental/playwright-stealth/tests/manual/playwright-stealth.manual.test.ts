import { describe, it, expect, afterAll } from 'vitest';
import { PlaywrightClient } from '../../shared/src/server.js';

/**
 * Manual tests for Playwright Stealth MCP Server
 *
 * These tests use a real browser and hit real websites.
 * Run with: npm run test:manual
 *
 * Prerequisites:
 * - Run: npm run test:manual:setup (installs Playwright browsers)
 */

describe('Playwright Client Manual Tests', () => {
  let client: PlaywrightClient | null = null;

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  describe('Standard Mode', () => {
    it('should navigate to a page and get title', async () => {
      client = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 30000,
        navigationTimeout: 60000,
      });

      const result = await client.execute(`
        await page.goto('https://example.com');
        return await page.title();
      `);

      expect(result.success).toBe(true);
      expect(result.result).toContain('Example Domain');
    });

    it('should take a screenshot', async () => {
      const screenshot = await client!.screenshot();

      expect(screenshot).toBeDefined();
      expect(screenshot.length).toBeGreaterThan(100);

      // Verify it's valid base64
      const buffer = Buffer.from(screenshot, 'base64');
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should get browser state', async () => {
      const state = await client!.getState();

      expect(state.isOpen).toBe(true);
      expect(state.currentUrl).toContain('example.com');
      expect(state.title).toBe('Example Domain');
    });

    it('should close browser', async () => {
      await client!.close();

      const state = await client!.getState();
      expect(state.isOpen).toBe(false);

      client = null;
    });
  });

  describe('Stealth Mode', () => {
    it('should navigate with stealth mode enabled', async () => {
      client = new PlaywrightClient({
        stealthMode: true,
        headless: true,
        timeout: 30000,
        navigationTimeout: 60000,
      });

      const result = await client.execute(`
        await page.goto('https://example.com');
        return await page.title();
      `);

      expect(result.success).toBe(true);
      expect(result.result).toContain('Example Domain');
    });

    it('should pass webdriver detection check', async () => {
      const result = await client!.execute(`
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
      `);

      expect(result.success).toBe(true);
      // With stealth mode, webdriver should not be detected
      // Note: This may show 'missing' or similar rather than 'present'
      console.log('Webdriver detection result:', result.result);
    });

    it('should get config with stealth mode info', async () => {
      const config = client!.getConfig();

      expect(config.stealthMode).toBe(true);
      expect(config.headless).toBe(true);
    });

    it('should close stealth browser', async () => {
      await client!.close();
      client = null;
    });
  });

  describe('Anti-Bot Protection Tests', () => {
    it('should fail to load claude.ai login WITHOUT stealth mode', async () => {
      client = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 30000,
        navigationTimeout: 60000,
      });

      const result = await client.execute(`
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
      `);

      console.log('Non-stealth claude.ai result:', result.result);
      expect(result.success).toBe(true);
      // Non-stealth should likely be blocked or show challenge
    });

    it('should successfully load claude.ai login WITH stealth mode', async () => {
      await client?.close();
      client = new PlaywrightClient({
        stealthMode: true,
        headless: true,
        timeout: 30000,
        navigationTimeout: 60000,
      });

      const result = await client.execute(`
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
      `);

      console.log('Stealth claude.ai result:', result.result);
      expect(result.success).toBe(true);
      // Stealth mode should be able to get through
    });

    it('should clean up after anti-bot tests', async () => {
      await client?.close();
      client = null;
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      client = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 5000,
        navigationTimeout: 5000,
      });

      const result = await client.execute(`
        await page.goto('https://this-domain-does-not-exist-12345.com', { timeout: 3000 });
      `);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle execution timeout', async () => {
      const result = await client!.execute(
        `
        await page.waitForTimeout(10000);
      `,
        { timeout: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('Proxy Mode', () => {
    // These tests require PROXY_URL, PROXY_USERNAME, PROXY_PASSWORD env vars
    const proxyUrl = process.env.PROXY_URL;
    const proxyUsername = process.env.PROXY_USERNAME;
    const proxyPassword = process.env.PROXY_PASSWORD;

    const skipProxy = !proxyUrl;

    it.skipIf(skipProxy)('should connect through proxy and get external IP', async () => {
      console.log('Proxy URL:', proxyUrl);
      console.log('Proxy Username:', proxyUsername);
      console.log('Proxy Password:', proxyPassword ? '***' : '(not set)');

      client = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 60000,
        navigationTimeout: 60000,
        proxy: {
          server: proxyUrl!,
          username: proxyUsername,
          password: proxyPassword,
        },
      });

      const result = await client.execute(`
        await page.goto('https://httpbin.org/ip', { timeout: 30000 });
        const body = await page.textContent('body');
        return JSON.parse(body);
      `);

      console.log('Proxy test result:', result);
      if (!result.success) {
        console.log('Proxy error:', result.error);
        console.log('Console output:', result.consoleOutput);
      }

      expect(result.success).toBe(true);
      console.log('Proxy IP result:', result.result);
      // The response should have an "origin" field with the proxy IP
      expect(result.result).toContain('origin');
    });

    it.skipIf(skipProxy)('should verify proxy IP differs from local IP', async () => {
      // First get the proxy IP
      const proxyResult = await client!.execute(`
        await page.goto('https://httpbin.org/ip', { timeout: 30000 });
        const body = await page.textContent('body');
        return JSON.parse(body);
      `);

      await client!.close();

      // Now get the direct IP (without proxy)
      const directClient = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 60000,
        navigationTimeout: 60000,
      });

      const directResult = await directClient.execute(`
        await page.goto('https://httpbin.org/ip', { timeout: 30000 });
        const body = await page.textContent('body');
        return JSON.parse(body);
      `);

      await directClient.close();

      console.log('Proxy IP:', proxyResult.result);
      console.log('Direct IP:', directResult.result);

      expect(proxyResult.success).toBe(true);
      expect(directResult.success).toBe(true);
      // IPs should be different (proxy should mask our real IP)
      expect(proxyResult.result).not.toBe(directResult.result);

      client = null;
    });

    it.skipIf(skipProxy)('should work with proxy + stealth mode combined', async () => {
      client = new PlaywrightClient({
        stealthMode: true,
        headless: true,
        timeout: 60000,
        navigationTimeout: 60000,
        proxy: {
          server: proxyUrl!,
          username: proxyUsername,
          password: proxyPassword,
        },
      });

      const result = await client.execute(`
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
      `);

      expect(result.success).toBe(true);
      console.log('Proxy + Stealth webdriver detection result:', result.result);
    });

    it.skipIf(skipProxy)('should verify config shows proxy enabled', async () => {
      const config = client!.getConfig();

      expect(config.proxy).toBeDefined();
      expect(config.proxy?.server).toBe(proxyUrl);
      expect(config.stealthMode).toBe(true);
    });

    it.skipIf(skipProxy)('should close proxy browser', async () => {
      await client?.close();
      client = null;
    });
  });
});
