import type { IExampleClient } from '../server.js';

interface MockData {
  // Define your mock data structure here
  // Example:
  // items?: Record<string, { id: string; name: string; value: string }>;
  // searchResponses?: Record<string, Array<{ query: string; results: any[] }>>;
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

    // Add your mock methods here based on IExampleClient interface
    // Example implementations:
    
    // async getItem(id: string): Promise<{ id: string; name: string; value: string }> {
    //   if (mockData.items?.[id]) {
    //     return mockData.items[id];
    //   }
    //   
    //   // Default mock response
    //   return {
    //     id,
    //     name: 'Mock Item',
    //     value: 'Mock value for ' + id,
    //   };
    // },
    
    // async searchItems(query: string, limit = 10): Promise<Array<{ id: string; name: string }>> {
    //   if (mockData.searchResponses?.[query]) {
    //     return mockData.searchResponses[query].slice(0, limit);
    //   }
    //   
    //   // Default mock response
    //   return [
    //     { id: '1', name: `Mock result for: ${query}` },
    //   ];
    // },
  };

  return client;
}