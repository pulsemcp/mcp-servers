import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import { registerResources } from './resources.js';
import { logWarning } from './logging.js';
import type {
  ExecuteResult,
  BrowserState,
  PlaywrightConfig,
  ProxyConfig,
  BrowserPermission,
} from './types.js';
import { ALL_BROWSER_PERMISSIONS } from './types.js';

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
 * Result of stopping a video recording
 */
export interface StopRecordingResult {
  /** Path to the saved video file on disk (Playwright temp location) */
  videoPath: string;
  /** URL the browser was on when recording stopped */
  pageUrl?: string;
  /** Page title when recording stopped */
  pageTitle?: string;
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
   * Take a screenshot of the current page, a specific element, or a page region.
   * Screenshots are automatically limited to MAX_SCREENSHOT_DIMENSION pixels.
   * If fullPage is requested but would exceed the limit, the screenshot is clipped.
   */
  screenshot(options?: {
    fullPage?: boolean;
    selector?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<ScreenshotResult>;

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

  /**
   * Whether the browser is currently recording video
   */
  isRecording(): boolean;

  /**
   * Start video recording by recycling the browser context.
   * Closes the current context and creates a new one with recordVideo enabled.
   * Navigates back to the previous URL to maintain continuity.
   * Session state (cookies, localStorage, sessionStorage) is preserved on a best-effort basis.
   */
  startRecording(videoDir: string): Promise<{ previousUrl?: string }>;

  /**
   * Stop video recording by recycling the browser context.
   * Gets the video path before closing the recording context, then creates
   * a new context without recording and navigates back to the previous URL.
   * Session state (cookies, localStorage, sessionStorage) is preserved on a best-effort basis.
   */
  stopRecording(): Promise<StopRecordingResult>;
}

/**
 * Saved session state for preserving cookies, localStorage, and sessionStorage
 * across browser context recycling (used during video recording start/stop).
 */
interface SavedSessionState {
  /** Playwright's storageState output (cookies + localStorage per origin) */
  storageState: {
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'Strict' | 'Lax' | 'None';
    }>;
    origins: Array<{
      origin: string;
      localStorage: Array<{ name: string; value: string }>;
    }>;
  };
  /** sessionStorage entries for the current origin (not covered by storageState) */
  sessionStorage?: Array<{ name: string; value: string }>;
  /** The origin of the page when state was captured (for sessionStorage restoration) */
  currentOrigin?: string;
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
  private _recording = false;

  constructor(config: PlaywrightConfig) {
    this.config = config;
  }

  private async ensureBrowser(options?: {
    recordVideo?: { dir: string; size: { width: number; height: number } };
  }): Promise<import('playwright').Page> {
    if (this.page) {
      return this.page;
    }

    await this.launchBrowserIfNeeded();

    await this.createContext(options);

    this.page = await this.context!.newPage();

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

  private async launchBrowserIfNeeded(): Promise<void> {
    if (this.browser) {
      return;
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
  }

  private async createContext(options?: {
    recordVideo?: { dir: string; size: { width: number; height: number } };
    storageState?: SavedSessionState['storageState'];
  }): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      // In stealth mode, let the plugin's user-agent-override handle the user agent
      // In non-stealth mode, use the provided user agent if any
      userAgent: this.config.stealthMode ? undefined : this.config.stealthUserAgent,
      // Ignore HTTPS errors by default (convenient for Docker, staging environments, self-signed certs)
      // Set IGNORE_HTTPS_ERRORS=false for strict certificate validation in production
      ignoreHTTPSErrors: this.config.ignoreHttpsErrors ?? true,
      // Video recording options (only set when recording)
      ...(options?.recordVideo ? { recordVideo: options.recordVideo } : {}),
      // Restore session state (cookies + localStorage) if provided
      ...(options?.storageState ? { storageState: options.storageState } : {}),
    });

    // Grant browser permissions (defaults to all permissions if not specified)
    const permissionsToGrant = this.config.permissions ?? [...ALL_BROWSER_PERMISSIONS];
    if (permissionsToGrant.length > 0) {
      try {
        await this.context.grantPermissions(permissionsToGrant);
      } catch (error) {
        // Some permissions may not be supported in all browsers/versions
        // Log a warning but continue - the browser will still function
        const message = error instanceof Error ? error.message : String(error);
        logWarning('permissions', `Failed to grant some permissions: ${message}`);
      }
    }
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

  async screenshot(options?: {
    fullPage?: boolean;
    selector?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<ScreenshotResult> {
    const page = await this.ensureBrowser();
    const fullPage = options?.fullPage ?? false;
    const selector = options?.selector;
    const clip = options?.clip;

    // Element screenshot mode
    if (selector) {
      const locator = page.locator(selector);
      const buffer = await locator.screenshot({ type: 'png' });
      return { data: buffer.toString('base64'), wasClipped: false };
    }

    // Clip region screenshot mode
    if (clip) {
      if (clip.width <= 0 || clip.height <= 0) {
        throw new Error('Clip width and height must be positive numbers');
      }
      const buffer = await page.screenshot({ type: 'png', clip });
      return { data: buffer.toString('base64'), wasClipped: false };
    }

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
        permissions: this.config.permissions ?? [...ALL_BROWSER_PERMISSIONS],
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
      this._recording = false;
    }
  }

  getConfig(): PlaywrightConfig {
    return this.config;
  }

  isRecording(): boolean {
    return this._recording;
  }

  /**
   * Capture session state (cookies, localStorage, sessionStorage) from the current context.
   * Uses Playwright's context.storageState() for cookies + localStorage,
   * and page.evaluate() for sessionStorage (not covered by storageState).
   */
  private async captureSessionState(): Promise<SavedSessionState | null> {
    if (!this.context || !this.page) return null;

    try {
      const storageState = await this.context.storageState();

      // Capture sessionStorage via page.evaluate (only for current origin)
      let sessionStorage: SavedSessionState['sessionStorage'];
      let currentOrigin: string | undefined;
      try {
        const currentUrl = this.page.url();
        if (currentUrl && currentUrl !== 'about:blank') {
          currentOrigin = new URL(currentUrl).origin;
          const entries = await this.page.evaluate(() => {
            const items: Array<{ name: string; value: string }> = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key !== null) {
                items.push({ name: key, value: window.sessionStorage.getItem(key) || '' });
              }
            }
            return items;
          });
          if (entries.length > 0) {
            sessionStorage = entries;
          }
        }
      } catch {
        // sessionStorage capture is best-effort
      }

      return { storageState, sessionStorage, currentOrigin };
    } catch {
      return null;
    }
  }

  /**
   * Restore sessionStorage after navigation.
   * Cookies and localStorage are handled by passing storageState to createContext().
   */
  private async restoreSessionStorage(state: SavedSessionState): Promise<void> {
    if (!this.page || !state.sessionStorage || !state.currentOrigin) return;

    try {
      const currentUrl = this.page.url();
      if (currentUrl && currentUrl !== 'about:blank') {
        const pageOrigin = new URL(currentUrl).origin;
        if (pageOrigin === state.currentOrigin) {
          await this.page.evaluate((items) => {
            for (const item of items) {
              window.sessionStorage.setItem(item.name, item.value);
            }
          }, state.sessionStorage);
        }
      }
    } catch {
      logWarning('session', 'Failed to restore sessionStorage after context recycling');
    }
  }

  private setupPageHandlers(page: import('playwright').Page): void {
    page.setDefaultTimeout(this.config.timeout);
    page.setDefaultNavigationTimeout(this.config.navigationTimeout);
    page.on('console', (msg) => {
      this.consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      if (this.consoleMessages.length > 100) {
        this.consoleMessages.shift();
      }
    });
  }

  async startRecording(videoDir: string): Promise<{ previousUrl?: string }> {
    await this.launchBrowserIfNeeded();

    // Capture session state BEFORE recycling the context
    const savedState = await this.captureSessionState();

    // Capture the current URL before recycling the context
    let previousUrl: string | undefined;
    if (this.page) {
      try {
        previousUrl = this.page.url();
        if (previousUrl === 'about:blank') {
          previousUrl = undefined;
        }
      } catch {
        // Page may be closed already
      }
    }

    // If currently recording, stop the existing recording first (close context to finalize video)
    if (this.context) {
      // Close the page and context to finalize any existing recording
      this.page = null;
      await this.context.close();
      this.context = null;
    }

    // Create a new context with video recording enabled, restoring session state
    await this.createContext({
      recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
      storageState: savedState?.storageState,
    });

    this.page = await this.context!.newPage();
    this.setupPageHandlers(this.page);

    // Navigate back to the previous URL if there was one
    if (previousUrl) {
      await this.page.goto(previousUrl);
    }

    // Restore sessionStorage after navigation (cookies + localStorage handled by storageState)
    if (savedState) {
      await this.restoreSessionStorage(savedState);
    }

    this._recording = true;
    return { previousUrl };
  }

  async stopRecording(): Promise<StopRecordingResult> {
    if (!this._recording || !this.page) {
      throw new Error('Not currently recording');
    }

    // Capture session state BEFORE closing the recording context
    const savedState = await this.captureSessionState();

    // Capture current page state before closing the context
    let pageUrl: string | undefined;
    let pageTitle: string | undefined;
    try {
      pageUrl = this.page.url();
      if (pageUrl === 'about:blank') {
        pageUrl = undefined;
      }
      pageTitle = await this.page.title();
    } catch {
      // Page may have issues
    }

    // Get the video path BEFORE closing the context
    const video = this.page.video();
    if (!video) {
      throw new Error('No video found on the current page');
    }
    const videoPath = await video.path();

    // Close page and context to finalize the video file
    this.page = null;
    await this.context!.close();
    this.context = null;
    this._recording = false;

    // Create a new context WITHOUT recording, restoring session state
    await this.createContext({
      storageState: savedState?.storageState,
    });

    this.page = await this.context!.newPage();
    this.setupPageHandlers(this.page);

    // Navigate back to the previous URL
    if (pageUrl) {
      await this.page.goto(pageUrl);
    }

    // Restore sessionStorage after navigation
    if (savedState) {
      await this.restoreSessionStorage(savedState);
    }

    return { videoPath, pageUrl, pageTitle };
  }
}

export type ClientFactory = () => IPlaywrightClient;

/**
 * Options for creating the MCP server
 */
export interface CreateMCPServerOptions {
  /** Server version (read from package.json) */
  version: string;
  /** Proxy configuration for browser connections */
  proxy?: ProxyConfig;
  /** Browser permissions to grant. If undefined, all permissions are granted. */
  permissions?: BrowserPermission[];
  /**
   * Whether to ignore HTTPS errors (certificate validation failures).
   * Defaults to true for convenience (Docker, staging environments, self-signed certs).
   * Set to false for strict certificate validation in production environments.
   */
  ignoreHttpsErrors?: boolean;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const stealthMode = process.env.STEALTH_MODE === 'true';

  const server = new Server(
    {
      name: 'playwright-stealth-mcp-server',
      version: options.version,
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
          proxy: options?.proxy,
          stealthUserAgent,
          stealthMaskLinux,
          stealthLocale,
          permissions: options?.permissions,
          ignoreHttpsErrors: options?.ignoreHttpsErrors,
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
