import type { IExampleClient } from '../server.js';

interface MockData {
  // Define your mock data structure here
  items?: Record<string, { id: string; name: string; value: string }>;
  searchResponses?: Record<string, Array<{ id: string; name: string; score: number }>>;
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of IExampleClient for integration tests.
 * This is similar to the functional test mock but doesn't rely on vitest.
 * Instead, it uses provided mock data to simulate different scenarios.
 */
export function createIntegrationMockExampleClient(
  mockData: MockData = {}
): IExampleClient & { mockData: MockData } {
  const client = {
    mockData, // Store the mock data so it can be extracted later

    // Mock methods based on IExampleClient interface
    async getItem(itemId: string): Promise<{ id: string; name: string; value: string }> {
      if (mockData.items?.[itemId]) {
        return mockData.items[itemId];
      }

      // Default mock response
      return {
        id: itemId,
        name: 'Mock Item',
        value: 'Mock value for ' + itemId,
      };
    },

    async searchItems(
      query: string,
      options?: { limit?: number; offset?: number; sortBy?: 'name' | 'created' | 'updated' }
    ): Promise<Array<{ id: string; name: string; score: number }>> {
      if (mockData.searchResponses?.[query]) {
        const results = mockData.searchResponses[query];
        const offset = options?.offset || 0;
        const limit = options?.limit || 10;
        return results.slice(offset, offset + limit);
      }

      // Default mock response
      return [{ id: '1', name: `Mock result for: ${query}`, score: 1.0 }];
    },
  };

  return client;
}
