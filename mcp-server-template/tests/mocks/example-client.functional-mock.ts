import { vi } from 'vitest';
import type { IExampleClient } from '../../shared/src/server.js';

export function createMockExampleClient(): IExampleClient {
  return {
    // Add your mock methods here
    // Example:
    // someMethod: vi.fn().mockResolvedValue({ data: 'mocked' }),
  };
}