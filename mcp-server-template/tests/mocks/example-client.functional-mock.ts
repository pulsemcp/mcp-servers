import { vi } from 'vitest';
import type { IExampleClient } from '../../shared/src/server.js';

export function createMockExampleClient(): IExampleClient {
  return {
    // Mock methods matching IExampleClient interface
    getItem: vi.fn().mockResolvedValue({
      id: 'test-id',
      name: 'Test Item',
      value: 'Test Value',
    }),
    
    searchItems: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test Result 1', score: 0.95 },
      { id: '2', name: 'Test Result 2', score: 0.85 },
    ]),
  };
}
