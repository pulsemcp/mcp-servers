/**
 * Types for Playwright Stealth MCP server
 */

/**
 * All permissions that Playwright supports granting to browser contexts.
 * Note: Not all permissions work in all browsers or browser versions.
 */
export const ALL_BROWSER_PERMISSIONS = [
  'accelerometer',
  'ambient-light-sensor',
  'background-sync',
  'camera',
  'clipboard-read',
  'clipboard-write',
  'geolocation',
  'gyroscope',
  'local-fonts',
  'magnetometer',
  'microphone',
  'midi',
  'midi-sysex',
  'notifications',
  'payment-handler',
  'storage-access',
] as const;

export type BrowserPermission = (typeof ALL_BROWSER_PERMISSIONS)[number];

/**
 * Proxy configuration for browser connections
 * Compatible with BrightData Residential Proxies and other HTTP/HTTPS proxies
 */
export interface ProxyConfig {
  /** Proxy server URL (e.g., "http://proxy.example.com:8080") */
  server: string;
  /** Optional username for proxy authentication */
  username?: string;
  /** Optional password for proxy authentication */
  password?: string;
  /** Optional comma-separated list of hosts to bypass proxy */
  bypass?: string;
}

export interface PlaywrightConfig {
  stealthMode: boolean;
  headless: boolean;
  timeout: number;
  navigationTimeout: number;
  /** Optional proxy configuration */
  proxy?: ProxyConfig;
  /** Custom User-Agent string for stealth mode (overrides default Windows UA) */
  stealthUserAgent?: string;
  /** Whether to mask Linux platform in stealth mode (default: true) */
  stealthMaskLinux?: boolean;
  /** Custom locale for stealth mode (default: 'en-US,en') */
  stealthLocale?: string;
  /**
   * Browser permissions to grant. Defaults to ALL_BROWSER_PERMISSIONS if not specified.
   * Use BROWSER_PERMISSIONS env var to constrain permissions (comma-separated list).
   */
  permissions?: BrowserPermission[];
  /**
   * Whether to ignore HTTPS errors (certificate validation failures).
   * Useful in Docker environments where SSL certificates may not match hostnames.
   * Automatically enabled when proxy is configured.
   * Use IGNORE_HTTPS_ERRORS env var to enable explicitly.
   */
  ignoreHttpsErrors?: boolean;
}

export interface ExecuteResult {
  success: boolean;
  result?: unknown;
  error?: string;
  consoleOutput?: string[];
}

export interface BrowserState {
  currentUrl?: string;
  title?: string;
  isOpen: boolean;
  /** Whether stealth mode is enabled */
  stealthMode?: boolean;
  /** Whether browser is running in headless mode */
  headless?: boolean;
  /** Whether proxy is enabled for browser connections */
  proxyEnabled?: boolean;
  /** Permissions granted to the browser context */
  permissions?: BrowserPermission[];
}
