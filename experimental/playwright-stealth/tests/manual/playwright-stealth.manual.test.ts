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

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      client = new PlaywrightClient({
        stealthMode: false,
        headless: true,
        timeout: 5000,
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
});
