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
}
