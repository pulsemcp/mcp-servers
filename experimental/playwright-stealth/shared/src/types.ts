/**
 * Types for Playwright Stealth MCP server
 */

export interface PlaywrightConfig {
  stealthMode: boolean;
  headless: boolean;
  timeout: number;
}

export interface ExecuteResult {
  success: boolean;
  result?: unknown;
  error?: string;
  consoleOutput?: string[];
  screenshot?: string;
}

export interface BrowserState {
  currentUrl?: string;
  title?: string;
  isOpen: boolean;
}
