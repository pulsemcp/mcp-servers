#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked Good Eggs client.
 * It uses the real MCP server but injects a mock client factory to avoid
 * actual browser automation during CI tests.
 *
 * Set GOOD_EGGS_MOCK_MODE=true to use the mock client.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, type IGoodEggsClient } from '../shared/index.js';
import type {
  GroceryItem,
  GroceryDetails,
  PastOrder,
  CartResult,
  GoodEggsConfig,
} from '../shared/types.js';

/**
 * Creates a mock Good Eggs client for integration testing
 */
function createMockGoodEggsClient(): IGoodEggsClient {
  const mockConfig: GoodEggsConfig = {
    username: 'test@example.com',
    password: 'testpassword',
    headless: true,
    timeout: 30000,
  };

  return {
    initialize: async (): Promise<void> => {
      // Mock initialization - no-op
    },

    searchGroceries: async (_query: string): Promise<GroceryItem[]> => {
      return [
        {
          url: 'https://www.goodeggs.com/product/123',
          name: 'Organic Honeycrisp Apples',
          brand: 'From Our Farmers',
          price: '$4.99',
          discount: '16% OFF',
        },
        {
          url: 'https://www.goodeggs.com/product/456',
          name: 'Organic Fuji Apples',
          brand: 'Hikari Farms',
          price: '$2.99',
        },
      ];
    },

    getFavorites: async (): Promise<GroceryItem[]> => {
      return [
        {
          url: 'https://www.goodeggs.com/product/789',
          name: 'Organic Milk',
          brand: 'Clover',
          price: '$6.99',
        },
      ];
    },

    getGroceryDetails: async (_groceryUrl: string): Promise<GroceryDetails> => {
      return {
        url: 'https://www.goodeggs.com/product/123',
        name: 'Organic Honeycrisp Apples',
        brand: 'From Our Farmers',
        price: '$4.99',
        originalPrice: '$5.97',
        discount: '16% OFF',
        description: 'Delicious organic honeycrisp apples from local farmers.',
        availability: ['Sun 1/4', 'Mon 1/5', 'Tue 1/6'],
      };
    },

    addToCart: async (_groceryUrl: string, quantity: number): Promise<CartResult> => {
      return {
        success: true,
        message: `Successfully added ${quantity} x Organic Honeycrisp Apples to cart`,
        itemName: 'Organic Honeycrisp Apples',
        quantity,
      };
    },

    searchFreebieGroceries: async (): Promise<GroceryItem[]> => {
      return [
        {
          url: 'https://www.goodeggs.com/product/deal1',
          name: 'Organic Cauliflower',
          brand: 'Lakeside Organic Gardens',
          price: '$3.99',
          discount: '33% OFF',
        },
      ];
    },

    getPastOrderDates: async (): Promise<PastOrder[]> => {
      return [
        {
          date: 'January 3, 2025',
          total: '$45.67',
          itemCount: 12,
        },
      ];
    },

    getPastOrderGroceries: async (_orderDate: string): Promise<GroceryItem[]> => {
      return [
        {
          url: 'https://www.goodeggs.com/product/past1',
          name: 'Celebration Truffles',
          brand: 'Good Eggs Select',
          price: '$34.49',
        },
      ];
    },

    getCurrentUrl: async (): Promise<string> => {
      return 'https://www.goodeggs.com/home';
    },

    close: async (): Promise<void> => {
      // Mock close - no-op
    },

    getConfig: (): GoodEggsConfig => {
      return mockConfig;
    },
  };
}

async function main() {
  const transport = new StdioServerTransport();

  // Create client factory that returns our mock
  const clientFactory = () => createMockGoodEggsClient();

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
