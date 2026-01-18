/**
 * Functional mock for unit tests
 * Provides controllable behavior for testing tool implementations
 */
import type { IPlaywrightClient, ScreenshotResult } from '../../shared/src/server.js';
import type { ExecuteResult, BrowserState, PlaywrightConfig } from '../../shared/src/types.js';
import { ALL_BROWSER_PERMISSIONS } from '../../shared/src/types.js';
import { vi } from 'vitest';

export function createFunctionalMockClient(options?: {
  proxyEnabled?: boolean;
  ignoreHttpsErrors?: boolean;
}): IPlaywrightClient {
  return {
    execute: vi.fn().mockResolvedValue({
      success: true,
      result: JSON.stringify({ mock: true }),
      consoleOutput: [],
    } as ExecuteResult),

    screenshot: vi.fn().mockResolvedValue({
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      wasClipped: false,
    } as ScreenshotResult),

    getState: vi.fn().mockResolvedValue({
      currentUrl: 'https://example.com',
      title: 'Example Domain',
      isOpen: true,
      permissions: [...ALL_BROWSER_PERMISSIONS],
    } as BrowserState),

    close: vi.fn().mockResolvedValue(undefined),

    getConfig: vi.fn().mockReturnValue({
      stealthMode: false,
      headless: true,
      timeout: 30000,
      navigationTimeout: 60000,
      proxy: options?.proxyEnabled
        ? {
            server: 'http://proxy.example.com:8080',
            username: 'testuser',
            password: 'testpass',
          }
        : undefined,
      ignoreHttpsErrors: options?.ignoreHttpsErrors,
    } as PlaywrightConfig),
  };
}
