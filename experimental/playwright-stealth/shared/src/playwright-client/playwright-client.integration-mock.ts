/**
 * Mock Playwright client for integration tests
 * Simulates browser behavior without launching a real browser
 */
import type { IPlaywrightClient, ScreenshotResult } from '../server.js';
import type { ExecuteResult, BrowserState, PlaywrightConfig } from '../types.js';

export class MockPlaywrightClient implements IPlaywrightClient {
  private state: BrowserState = { isOpen: false };
  private config: PlaywrightConfig;

  constructor(config: PlaywrightConfig) {
    this.config = config;
  }

  async execute(code: string, options?: { timeout?: number }): Promise<ExecuteResult> {
    // Simulate browser being opened
    this.state.isOpen = true;

    // Simple mock responses based on code content
    if (code.includes('page.goto')) {
      const urlMatch = code.match(/goto\(['"`]([^'"`]+)['"`]\)/);
      if (urlMatch) {
        this.state.currentUrl = urlMatch[1];
        this.state.title = `Mock Page - ${urlMatch[1]}`;
      }
      return {
        success: true,
        result: undefined,
        consoleOutput: [],
      };
    }

    if (code.includes('page.title')) {
      return {
        success: true,
        result: JSON.stringify(this.state.title || 'Mock Title'),
        consoleOutput: [],
      };
    }

    if (code.includes('error') || code.includes('throw')) {
      return {
        success: false,
        error: 'Mock error for testing',
        consoleOutput: ['[error] Mock error occurred'],
      };
    }

    // Check for timeout
    if (options?.timeout && options.timeout < 100) {
      return {
        success: false,
        error: `Execution timed out after ${options.timeout}ms`,
        consoleOutput: [],
      };
    }

    return {
      success: true,
      result: JSON.stringify({ mock: true, code: code.substring(0, 50) }),
      consoleOutput: ['[log] Mock execution completed'],
    };
  }

  async screenshot(): Promise<ScreenshotResult> {
    // Return a minimal valid PNG as base64 (1x1 transparent pixel)
    return {
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      wasClipped: false,
    };
  }

  async getState(): Promise<BrowserState> {
    return { ...this.state };
  }

  async close(): Promise<void> {
    this.state = { isOpen: false };
  }

  getConfig(): PlaywrightConfig {
    return this.config;
  }
}

export function createMockPlaywrightClient(): IPlaywrightClient {
  return new MockPlaywrightClient({
    stealthMode: false,
    headless: true,
    timeout: 30000,
    navigationTimeout: 60000,
  });
}
