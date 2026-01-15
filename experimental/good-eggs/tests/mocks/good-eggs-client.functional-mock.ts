import type { IGoodEggsClient } from '../../shared/src/server.js';
import type {
  GroceryItem,
  GroceryDetails,
  PastOrder,
  CartResult,
  GoodEggsConfig,
} from '../../shared/src/types.js';

/**
 * Creates a mock Good Eggs client for functional testing
 */
export function createMockGoodEggsClient(): IGoodEggsClient {
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
        {
          date: 'December 28, 2024',
          total: '$62.34',
          itemCount: 15,
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
          quantity: '1 box',
        },
        {
          url: 'https://www.goodeggs.com/product/past2',
          name: 'Organic Red Bell Pepper',
          brand: 'From Our Farmers',
          price: '$3.99',
          quantity: '2 count',
        },
      ];
    },

    addFavorite: async (_groceryUrl: string): Promise<CartResult> => {
      return {
        success: true,
        message: 'Successfully added Organic Honeycrisp Apples to favorites',
        itemName: 'Organic Honeycrisp Apples',
      };
    },

    removeFavorite: async (_groceryUrl: string): Promise<CartResult> => {
      return {
        success: true,
        message: 'Successfully removed Organic Honeycrisp Apples from favorites',
        itemName: 'Organic Honeycrisp Apples',
      };
    },

    removeFromCart: async (_groceryUrl: string): Promise<CartResult> => {
      return {
        success: true,
        message: 'Successfully removed Organic Honeycrisp Apples from cart',
        itemName: 'Organic Honeycrisp Apples',
      };
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
