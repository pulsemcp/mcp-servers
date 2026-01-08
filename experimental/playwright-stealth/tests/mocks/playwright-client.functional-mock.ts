/**
 * Functional mock for unit tests
 * Provides controllable behavior for testing tool implementations
 */
import type { IPlaywrightClient } from '../../shared/src/server.js';
import type { ExecuteResult, BrowserState, PlaywrightConfig } from '../../shared/src/types.js';
import { vi } from 'vitest';

export function createFunctionalMockClient(options?: {
  proxyEnabled?: boolean;
}): IPlaywrightClient {
  return {
    execute: vi.fn().mockResolvedValue({
      success: true,
      result: JSON.stringify({ mock: true }),
      consoleOutput: [],
    } as ExecuteResult),

    screenshot: vi
      .fn()
      .mockResolvedValue(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ),

    getState: vi.fn().mockResolvedValue({
      currentUrl: 'https://example.com',
      title: 'Example Domain',
      isOpen: true,
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
    } as PlaywrightConfig),
  };
}
