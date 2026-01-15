import { describe, it, expect, beforeEach } from 'vitest';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockGoodEggsClient } from '../mocks/good-eggs-client.functional-mock.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { IGoodEggsClient } from '../../shared/src/server.js';

describe('Good Eggs Tools', () => {
  let mockClient: IGoodEggsClient;
  let callTool: (name: string, args: unknown) => Promise<unknown>;

  beforeEach(() => {
    mockClient = createMockGoodEggsClient();

    // Capture the CallToolRequest handler during registration
    let toolCallHandler:
      | ((request: { params: { name: string; arguments: unknown } }) => Promise<unknown>)
      | null = null;

    const mockServer = {
      setRequestHandler: (schema: unknown, handler: (request: unknown) => Promise<unknown>) => {
        // Check if this is the CallToolRequestSchema by comparing reference
        if (schema === CallToolRequestSchema) {
          toolCallHandler = handler as (request: {
            params: { name: string; arguments: unknown };
          }) => Promise<unknown>;
        }
      },
    };

    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer as never);

    // Create a helper to call tools
    callTool = async (name: string, args: unknown) => {
      if (!toolCallHandler) throw new Error('Tool handler not registered');
      return toolCallHandler({ params: { name, arguments: args } });
    };
  });

  describe('search_for_grocery', () => {
    it('should search for groceries and return results', async () => {
      const result = await callTool('search_for_grocery', { query: 'apples' });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Found 2 groceries'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Organic Honeycrisp Apples'
      );
    });

    it('should handle no results', async () => {
      mockClient.searchGroceries = async () => [];

      const result = await callTool('search_for_grocery', { query: 'nonexistent' });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'No groceries found'
      );
    });
  });

  describe('get_favorites', () => {
    it('should return favorite items', async () => {
      const result = await callTool('get_favorites', {});

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Found 1 favorite items'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Organic Milk'
      );
    });
  });

  describe('get_grocery_details', () => {
    it('should return product details', async () => {
      const result = await callTool('get_grocery_details', {
        grocery_url: 'https://www.goodeggs.com/product/123',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Organic Honeycrisp Apples'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('$4.99');
    });
  });

  describe('add_to_cart', () => {
    it('should add item to cart', async () => {
      const result = await callTool('add_to_cart', {
        grocery_url: 'https://www.goodeggs.com/product/123',
        quantity: 2,
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Successfully added'
      );
    });

    it('should use default quantity of 1', async () => {
      const result = await callTool('add_to_cart', {
        grocery_url: 'https://www.goodeggs.com/product/123',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Successfully added'
      );
    });
  });

  describe('search_for_freebie_groceries', () => {
    it('should return deals and freebies', async () => {
      const result = await callTool('search_for_freebie_groceries', {});

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'deals/freebies'
      );
    });
  });

  describe('get_list_of_past_order_dates', () => {
    it('should return past order dates', async () => {
      const result = await callTool('get_list_of_past_order_dates', {});

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'past orders'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'January 3, 2025'
      );
    });
  });

  describe('get_past_order_groceries', () => {
    it('should return items from past order with quantity and price', async () => {
      const result = await callTool('get_past_order_groceries', {
        past_order_date: 'January 3, 2025',
      });

      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('items from order');
      expect(text).toContain('Quantity:');
      expect(text).toContain('Price:');
      expect(text).toContain('1 box');
      expect(text).toContain('$34.49');
    });
  });

  describe('add_favorite', () => {
    it('should add item to favorites', async () => {
      const result = await callTool('add_favorite', {
        grocery_url: 'https://www.goodeggs.com/product/123',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Successfully added'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'favorites'
      );
    });
  });

  describe('remove_favorite', () => {
    it('should remove item from favorites', async () => {
      const result = await callTool('remove_favorite', {
        grocery_url: 'https://www.goodeggs.com/product/123',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Successfully removed'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'favorites'
      );
    });
  });

  describe('remove_from_cart', () => {
    it('should remove item from cart', async () => {
      const result = await callTool('remove_from_cart', {
        grocery_url: 'https://www.goodeggs.com/product/123',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Successfully removed'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('cart');
    });
  });
});
