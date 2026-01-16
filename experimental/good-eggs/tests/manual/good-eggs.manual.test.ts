import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit real Good Eggs API via Playwright browser automation.
 * These tests are NOT run in CI and require actual Good Eggs credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with credentials:
 *    GOOD_EGGS_USERNAME=your-email@example.com
 *    GOOD_EGGS_PASSWORD=your-password
 * 2. Run: npm run test:manual
 *
 * Test outcomes:
 * - SUCCESS: Test passed, Good Eggs responded as expected
 * - WARNING: Test passed but with unexpected behavior
 * - FAILURE: Test failed
 */

// Define test outcome types
type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

// Helper to report test outcomes
function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Good Eggs Manual Tests', () => {
  let client: TestMCPClient | null = null;
  let username: string | undefined;
  let password: string | undefined;

  beforeAll(async () => {
    // Check for required environment variables
    username = process.env.GOOD_EGGS_USERNAME;
    password = process.env.GOOD_EGGS_PASSWORD;

    if (!username || !password) {
      console.warn('⚠️  GOOD_EGGS_USERNAME and GOOD_EGGS_PASSWORD not set. Tests will be skipped.');
      return;
    }

    // Create test client with real credentials
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        GOOD_EGGS_USERNAME: username,
        GOOD_EGGS_PASSWORD: password,
        HEADLESS: 'true',
        TIMEOUT: '60000',
      },
      debug: false,
    });

    await client.connect();
  }, 120000); // 2 minute timeout for browser startup and login

  afterAll(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('search_for_grocery', () => {
    it('should search for groceries on real Good Eggs', async () => {
      const testName = 'search_for_grocery - real search';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('search_for_grocery', {
          query: 'organic apples',
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Found N groceries for..." or "No groceries found for..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('Found') && text.includes('groceries for')) {
          reportOutcome(testName, 'SUCCESS', 'Search returned results');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else if (text.includes('No groceries found')) {
          reportOutcome(testName, 'SUCCESS', 'No results found - valid response');
          console.log('   Response:', text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('get_favorites', () => {
    it('should get user favorites from real Good Eggs', async () => {
      const testName = 'get_favorites - real favorites';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_favorites', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Found N favorite items..." or "No favorite items found..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('favorite item')) {
          reportOutcome(testName, 'SUCCESS', 'Favorites retrieved successfully');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('search_for_freebie_groceries', () => {
    it('should search for deals on real Good Eggs', async () => {
      const testName = 'search_for_freebie_groceries - real deals';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('search_for_freebie_groceries', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Found N deals/freebies..." or "No free items or deals..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (
          text.includes('deals') ||
          text.includes('freebies') ||
          text.includes('No free items')
        ) {
          reportOutcome(testName, 'SUCCESS', 'Deals search completed');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('get_list_of_past_order_dates', () => {
    it('should get past orders from real Good Eggs', async () => {
      const testName = 'get_list_of_past_order_dates - real orders';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_list_of_past_order_dates', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Found N past orders..." or "No past orders found."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('past orders') || text.includes('No past orders')) {
          reportOutcome(testName, 'SUCCESS', 'Past orders retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('get_grocery_details', () => {
    it('should get grocery details from real Good Eggs', async () => {
      const testName = 'get_grocery_details - real product';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First search for a product to get a real URL
        const searchResult = await client.callTool('search_for_grocery', {
          query: 'milk',
        });
        const searchText = (searchResult as { content: Array<{ text: string }> }).content[0].text;

        // Extract a URL from the search results
        const urlMatch = searchText.match(/https:\/\/www\.goodeggs\.com\/[^\s]+/);
        if (!urlMatch) {
          reportOutcome(testName, 'WARNING', 'Could not find a product URL from search');
          return;
        }

        const result = await client.callTool('get_grocery_details', {
          grocery_url: urlMatch[0],
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "**ProductName**\nBrand: ...\nPrice: ..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('Price:') || text.includes('Brand:')) {
          reportOutcome(testName, 'SUCCESS', 'Product details retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('add_to_cart', () => {
    it('should add item to cart on real Good Eggs', async () => {
      const testName = 'add_to_cart - real add';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First search for a product to get a real URL
        const searchResult = await client.callTool('search_for_grocery', {
          query: 'banana',
        });
        const searchText = (searchResult as { content: Array<{ text: string }> }).content[0].text;

        // Extract a URL from the search results
        const urlMatch = searchText.match(/https:\/\/www\.goodeggs\.com\/[^\s]+/);
        if (!urlMatch) {
          reportOutcome(testName, 'WARNING', 'Could not find a product URL from search');
          return;
        }

        const result = await client.callTool('add_to_cart', {
          grocery_url: urlMatch[0],
          quantity: 1,
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Successfully added N x ItemName to cart" or "Failed..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('Successfully added')) {
          reportOutcome(testName, 'SUCCESS', 'Item added to cart');
          console.log('   Result:', text);
        } else if (text.includes('Failed') || text.includes('Could not')) {
          reportOutcome(testName, 'WARNING', 'Add to cart may have failed: ' + text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('get_past_order_groceries', () => {
    it('should get groceries from past order on real Good Eggs', async () => {
      const testName = 'get_past_order_groceries - real order';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First get past order dates
        const datesResult = await client.callTool('get_list_of_past_order_dates', {});
        const datesText = (datesResult as { content: Array<{ text: string }> }).content[0].text;

        if (datesText.includes('No past orders')) {
          reportOutcome(testName, 'WARNING', 'No past orders to test with');
          return;
        }

        // Extract a date from the results (look for a pattern like "January 3, 2025")
        const dateMatch = datesText.match(/\*\*([A-Za-z]+ \d+, \d{4})\*\*/);
        if (!dateMatch) {
          reportOutcome(testName, 'WARNING', 'Could not extract date from past orders');
          return;
        }

        const result = await client.callTool('get_past_order_groceries', {
          past_order_date: dateMatch[1],
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Found N items from order..." or "No items found for order..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('items from order') || text.includes('No items found')) {
          reportOutcome(testName, 'SUCCESS', 'Past order groceries retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('add_favorite', () => {
    it('should add item to favorites on real Good Eggs', async () => {
      const testName = 'add_favorite - real add';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First search for a product to get a real URL
        const searchResult = await client.callTool('search_for_grocery', {
          query: 'avocado',
        });
        const searchText = (searchResult as { content: Array<{ text: string }> }).content[0].text;

        // Extract a URL from the search results
        const urlMatch = searchText.match(/https:\/\/www\.goodeggs\.com\/[^\s]+/);
        if (!urlMatch) {
          reportOutcome(testName, 'WARNING', 'Could not find a product URL from search');
          return;
        }

        const result = await client.callTool('add_favorite', {
          grocery_url: urlMatch[0],
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Successfully added ItemName to favorites" or "ItemName is already in favorites"
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('to favorites') || text.includes('already in favorites')) {
          reportOutcome(testName, 'SUCCESS', 'Favorite operation completed');
          console.log('   Result:', text);
        } else if (text.includes('Failed') || text.includes('Could not find')) {
          reportOutcome(testName, 'WARNING', 'Favorite button may not be found: ' + text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('remove_favorite', () => {
    it('should remove item from favorites on real Good Eggs', async () => {
      const testName = 'remove_favorite - real remove';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First search for a product to get a real URL
        const searchResult = await client.callTool('search_for_grocery', {
          query: 'avocado',
        });
        const searchText = (searchResult as { content: Array<{ text: string }> }).content[0].text;

        // Extract a URL from the search results
        const urlMatch = searchText.match(/https:\/\/www\.goodeggs\.com\/[^\s]+/);
        if (!urlMatch) {
          reportOutcome(testName, 'WARNING', 'Could not find a product URL from search');
          return;
        }

        const result = await client.callTool('remove_favorite', {
          grocery_url: urlMatch[0],
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Successfully removed ItemName from favorites" or "ItemName is not in favorites"
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('from favorites') || text.includes('not in favorites')) {
          reportOutcome(testName, 'SUCCESS', 'Remove favorite operation completed');
          console.log('   Result:', text);
        } else if (text.includes('Failed') || text.includes('Could not find')) {
          reportOutcome(testName, 'WARNING', 'Favorite button may not be found: ' + text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('remove_from_cart', () => {
    it('should remove item from cart on real Good Eggs', async () => {
      const testName = 'remove_from_cart - real remove';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First, add something to cart
        const searchResult = await client.callTool('search_for_grocery', {
          query: 'bread',
        });
        const searchText = (searchResult as { content: Array<{ text: string }> }).content[0].text;

        // Extract a URL from the search results
        const urlMatch = searchText.match(/https:\/\/www\.goodeggs\.com\/[^\s]+/);
        if (!urlMatch) {
          reportOutcome(testName, 'WARNING', 'Could not find a product URL from search');
          return;
        }

        // Add to cart first
        await client.callTool('add_to_cart', {
          grocery_url: urlMatch[0],
          quantity: 1,
        });

        // Now try to remove it
        const result = await client.callTool('remove_from_cart', {
          grocery_url: urlMatch[0],
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Successfully removed ItemName from cart" or "Item not found in cart"
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('from cart') || text.includes('not found in cart')) {
          reportOutcome(testName, 'SUCCESS', 'Remove from cart operation completed');
          console.log('   Result:', text);
        } else if (text.includes('Failed')) {
          reportOutcome(testName, 'WARNING', 'Remove from cart may have failed: ' + text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 120000);
  });

  describe('get_cart', () => {
    it('should get cart contents from real Good Eggs', async () => {
      const testName = 'get_cart - real cart';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_cart', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        // Response format: "Your cart has N products..." or "Your cart is empty..."
        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('Your cart has') || text.includes('Your cart is empty')) {
          reportOutcome(testName, 'SUCCESS', 'Cart contents retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });
});
