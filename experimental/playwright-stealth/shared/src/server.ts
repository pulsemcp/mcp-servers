import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type { ExecuteResult, BrowserState, PlaywrightConfig, ProxyConfig } from './types.js';

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
   * Take a screenshot of the current page
   */
  screenshot(options?: { fullPage?: boolean }): Promise<string>;

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

      chromium.use(StealthPlugin());

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
      userAgent: this.config.stealthMode
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        : undefined,
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

  async screenshot(options?: { fullPage?: boolean }): Promise<string> {
    const page = await this.ensureBrowser();
    const buffer = await page.screenshot({
      fullPage: options?.fullPage ?? false,
      type: 'png',
    });
    return buffer.toString('base64');
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
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
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

        activeClient = new PlaywrightClient({
          stealthMode,
          headless,
          timeout,
          navigationTimeout,
          proxy: proxyConfig,
        });
        return activeClient;
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  const cleanup = async () => {
    if (activeClient) {
      await activeClient.close();
      activeClient = null;
    }
  };

  return { server, registerHandlers, cleanup };
}
