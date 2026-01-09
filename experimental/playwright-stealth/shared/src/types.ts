/**
 * Types for Playwright Stealth MCP server
 */

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
}
