import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import { registerResources } from './resources.js';
import type { ExecuteResult, BrowserState, PlaywrightConfig, ProxyConfig } from './types.js';

/**
 * Maximum allowed dimension for screenshots in pixels.
 * Claude's API rejects images where either dimension exceeds 8000 pixels.
 */
export const MAX_SCREENSHOT_DIMENSION = 8000;

/**
 * Screenshot result containing the image data and metadata
 */
export interface ScreenshotResult {
  /** Base64-encoded PNG image data */
  data: string;
  /** Whether the screenshot was clipped due to dimension limits */
  wasClipped: boolean;
  /** Warning message if the screenshot was limited */
  warning?: string;
}

/**
 * Playwright client interface
 * Defines all methods for browser automation
 */
export interface IPlaywrightClient {
  /**
   * Execute Playwright code in the browser context
   */
  execute(code: string, options?: { timeout?: number }): Promise<ExecuteResult>;

  /**
   * Take a screenshot of the current page.
   * Screenshots are automatically limited to MAX_SCREENSHOT_DIMENSION pixels.
   * If fullPage is requested but would exceed the limit, the screenshot is clipped.
   */
  screenshot(options?: { fullPage?: boolean }): Promise<ScreenshotResult>;

  /**
   * Get the current browser state
   */
  getState(): Promise<BrowserState>;

  /**
   * Close the browser
   */
  close(): Promise<void>;

  /**
   * Get the configuration
   */
  getConfig(): PlaywrightConfig;
}

/**
 * Playwright client implementation with optional stealth mode
 */
export class PlaywrightClient implements IPlaywrightClient {
  private browser: import('playwright').Browser | null = null;
  private context: import('playwright').BrowserContext | null = null;
  private page: import('playwright').Page | null = null;
  private consoleMessages: string[] = [];
  private config: PlaywrightConfig;

  constructor(config: PlaywrightConfig) {
    this.config = config;
  }

  private async ensureBrowser(): Promise<import('playwright').Page> {
    if (this.page) {
      return this.page;
    }

    // Build proxy options for Playwright if configured
    const proxyOptions = this.config.proxy
      ? {
          server: this.config.proxy.server,
          username: this.config.proxy.username,
          password: this.config.proxy.password,
          bypass: this.config.proxy.bypass,
        }
      : undefined;

    if (this.config.stealthMode) {
      // Use playwright-extra with stealth plugin
      const { chromium } = await import('playwright-extra');
      const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;

      // Configure stealth plugin with custom user-agent-override settings
      const stealth = StealthPlugin();

      // Remove default user-agent-override evasion to reconfigure with custom options
      stealth.enabledEvasions.delete('user-agent-override');
      chromium.use(stealth);

      // Add user-agent-override evasion with configurable options
      const UserAgentOverridePlugin = (
        await import('puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js')
      ).default;
      chromium.use(
        UserAgentOverridePlugin({
          userAgent: this.config.stealthUserAgent,
          locale: this.config.stealthLocale ?? 'en-US,en',
          maskLinux: this.config.stealthMaskLinux ?? true,
        })
      );

      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
        proxy: proxyOptions,
      });
    } else {
      // Use standard playwright
      const { chromium } = await import('playwright');

      this.browser = await chromium.launch({
        headless: this.config.headless,
        proxy: proxyOptions,
      });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      // In stealth mode, let the plugin's user-agent-override handle the user agent
      // In non-stealth mode, use the provided user agent if any
      userAgent: this.config.stealthMode ? undefined : this.config.stealthUserAgent,
      // Ignore HTTPS errors when using proxy (required for residential proxies like BrightData
      // which perform HTTPS inspection and may re-sign certificates)
      ignoreHTTPSErrors: !!this.config.proxy,
    });

    this.page = await this.context.newPage();

    // Apply timeout configuration to Playwright
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.navigationTimeout);

    // Capture console messages
    this.page.on('console', (msg) => {
      this.consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      // Keep only last 100 messages
      if (this.consoleMessages.length > 100) {
        this.consoleMessages.shift();
      }
    });

    return this.page;
  }

  async execute(code: string, options?: { timeout?: number }): Promise<ExecuteResult> {
    const timeout = options?.timeout ?? this.config.timeout;

    try {
      const page = await this.ensureBrowser();

      // Clear console messages for this execution
      const startIndex = this.consoleMessages.length;

      // Create the execution context with page available
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction('page', code);

      // Execute with timeout
      const result = await Promise.race([
        fn(page),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Execution timed out after ${timeout}ms`)), timeout)
        ),
      ]);

      // Get console output from this execution
      const consoleOutput = this.consoleMessages.slice(startIndex);

      return {
        success: true,
        result: result !== undefined ? JSON.stringify(result, null, 2) : undefined,
        consoleOutput,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        consoleOutput: this.consoleMessages.slice(-10),
      };
    }
  }

  async screenshot(options?: { fullPage?: boolean }): Promise<ScreenshotResult> {
    const page = await this.ensureBrowser();
    const fullPage = options?.fullPage ?? false;

    // Check page dimensions before taking a full-page screenshot
    if (fullPage) {
      // Get page dimensions from the browser context
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));

      // Check if either dimension would exceed the limit
      if (
        dimensions.scrollWidth > MAX_SCREENSHOT_DIMENSION ||
        dimensions.scrollHeight > MAX_SCREENSHOT_DIMENSION
      ) {
        // Calculate a safe clip region that respects the max dimension
        const clipWidth = Math.min(dimensions.scrollWidth, MAX_SCREENSHOT_DIMENSION);
        const clipHeight = Math.min(dimensions.scrollHeight, MAX_SCREENSHOT_DIMENSION);

        const buffer = await page.screenshot({
          type: 'png',
          clip: {
            x: 0,
            y: 0,
            width: clipWidth,
            height: clipHeight,
          },
        });

        return {
          data: buffer.toString('base64'),
          wasClipped: true,
          warning: `Full page screenshot would exceed ${MAX_SCREENSHOT_DIMENSION}px limit (page is ${dimensions.scrollWidth}x${dimensions.scrollHeight}px). Screenshot was clipped to ${clipWidth}x${clipHeight}px.`,
        };
      }
    }

    // Take normal screenshot (viewport or full page within limits)
    const buffer = await page.screenshot({
      fullPage,
      type: 'png',
    });

    return {
      data: buffer.toString('base64'),
      wasClipped: false,
    };
  }

  async getState(): Promise<BrowserState> {
    if (!this.page) {
      return { isOpen: false };
    }

    try {
      return {
        currentUrl: this.page.url(),
        title: await this.page.title(),
        isOpen: true,
      };
    } catch {
      return { isOpen: false };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.consoleMessages = [];
    }
  }

  getConfig(): PlaywrightConfig {
    return this.config;
  }
}

export type ClientFactory = () => IPlaywrightClient;

export function createMCPServer(proxyConfig?: ProxyConfig) {
  const stealthMode = process.env.STEALTH_MODE === 'true';

  const server = new Server(
    {
      name: 'playwright-stealth-mcp-server',
      version: '0.0.5',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Track active client for cleanup
  let activeClient: IPlaywrightClient | null = null;

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const headless = process.env.HEADLESS !== 'false';
        const timeout = parseInt(process.env.TIMEOUT || '30000', 10);
        const navigationTimeout = parseInt(process.env.NAVIGATION_TIMEOUT || '60000', 10);
        const stealthUserAgent = process.env.STEALTH_USER_AGENT;
        const stealthMaskLinux =
          process.env.STEALTH_MASK_LINUX === undefined
            ? undefined
            : process.env.STEALTH_MASK_LINUX !== 'false';
        const stealthLocale = process.env.STEALTH_LOCALE;

        activeClient = new PlaywrightClient({
          stealthMode,
          headless,
          timeout,
          navigationTimeout,
          proxy: proxyConfig,
          stealthUserAgent,
          stealthMaskLinux,
          stealthLocale,
        });
        return activeClient;
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);

    // Register resources handlers for screenshot storage
    registerResources(server);
  };

  const cleanup = async () => {
    if (activeClient) {
      await activeClient.close();
      activeClient = null;
    }
  };

  return { server, registerHandlers, cleanup };
}
