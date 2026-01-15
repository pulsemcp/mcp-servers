import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory, IGoodEggsClient } from './server.js';
import {
  SearchGrocerySchema,
  GetGroceryDetailsSchema,
  AddToCartSchema,
  GetPastOrderGroceriesSchema,
  AddFavoriteSchema,
  RemoveFavoriteSchema,
  RemoveFromCartSchema,
} from './types.js';

// =============================================================================
// TOOL DESCRIPTIONS
// =============================================================================

const SEARCH_GROCERY_DESCRIPTION = `Search for groceries on Good Eggs.

Returns a list of grocery items matching your search query, including:
- Product URL (for use with other tools)
- Product name and brand
- Price information
- Any discounts/deals

**Example queries:**
- "organic apples"
- "milk"
- "chicken breast"
- "gluten free bread"`;

const GET_FAVORITES_DESCRIPTION = `Get the user's favorite/saved grocery items on Good Eggs.

Returns a list of all items the user has marked as favorites, including:
- Product URL (for use with other tools)
- Product name and brand
- Price information

Requires the user to be logged in.`;

const GET_GROCERY_DETAILS_DESCRIPTION = `Get detailed information about a specific grocery item.

Provide the Good Eggs URL of the item (from search results or favorites).
Returns comprehensive details including:
- Full product name and brand
- Current and original prices
- Product description
- Delivery availability dates

**Tip:** This tool checks if you're already on the product page to minimize navigation.`;

const ADD_TO_CART_DESCRIPTION = `Add a grocery item to your shopping cart.

Provide:
- grocery_url: The Good Eggs URL of the item to add
- quantity: Number of items to add (default: 1)

Returns confirmation of the item added and quantity.

**Tip:** This tool checks if you're already on the product page to minimize navigation.`;

const SEARCH_FREEBIE_GROCERIES_DESCRIPTION = `Search for free items ($0.00) on Good Eggs.

Checks the homepage and /fresh-picks page for items priced at $0.00.
These are typically promotional freebies offered by Good Eggs.

Returns a list of free items with their URLs for adding to cart.`;

const GET_PAST_ORDER_DATES_DESCRIPTION = `Get a list of past order dates from Good Eggs.

Returns a list of previous orders with:
- Order date
- Order total (if available)
- Number of items (if available)

Use these dates with get_past_order_groceries to see specific order contents.
Requires the user to be logged in.`;

const GET_PAST_ORDER_GROCERIES_DESCRIPTION = `Get the grocery items from a specific past order.

Provide the past_order_date (from get_list_of_past_order_dates) to see what was ordered.
Returns a list of items from that order including:
- Product URL
- Product name and brand
- Quantity ordered (e.g., 2 if you ordered 2 of something)
- Unit of sale (e.g., "1 bunch", "1 lb", "15 oz")
- Price at time of order

Useful for reordering frequently purchased items.
Requires the user to be logged in.`;

const ADD_FAVORITE_DESCRIPTION = `Add a grocery item to your favorites.

Provide the Good Eggs URL of the item to add to favorites.
If the item is already in favorites, it will let you know.

Returns confirmation of the action taken.`;

const REMOVE_FAVORITE_DESCRIPTION = `Remove a grocery item from your favorites.

Provide the Good Eggs URL of the item to remove from favorites.
If the item is not in favorites, it will let you know.

Returns confirmation of the action taken.`;

const REMOVE_FROM_CART_DESCRIPTION = `Remove a grocery item from your shopping cart.

Provide the Good Eggs URL of the item to remove from your cart.
Navigates to the cart and removes the specified item.

Returns confirmation of the removal or an error if the item is not in the cart.`;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

/**
 * Async getter that returns a ready-to-use client (login completed)
 */
export type GetReadyClientFn = () => Promise<IGoodEggsClient>;

export function createRegisterTools(
  clientFactory: ClientFactory,
  getReadyClient?: GetReadyClientFn
) {
  // Create a single client instance that persists across calls
  let client: IGoodEggsClient | null = null;
  let isInitialized = false;

  // If getReadyClient is provided (background login mode), use it
  // Otherwise fall back to lazy initialization (legacy behavior)
  const getClient = async (): Promise<IGoodEggsClient> => {
    if (getReadyClient) {
      // Use the provided getter that handles background login
      return getReadyClient();
    }

    // Legacy behavior: lazy initialization
    if (!client) {
      client = clientFactory();
    }
    if (!isInitialized) {
      await client.initialize();
      isInitialized = true;
    }
    return client;
  };

  const tools: Tool[] = [
    {
      name: 'search_for_grocery',
      description: SEARCH_GROCERY_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query for groceries (e.g., "organic apples", "milk", "bread")',
          },
        },
        required: ['query'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = SearchGrocerySchema.parse(args);
          const goodEggsClient = await getClient();
          const results = await goodEggsClient.searchGroceries(validated.query);

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No groceries found for "${validated.query}". Try a different search term.`,
                },
              ],
            };
          }

          const formattedResults = results
            .map(
              (item, i) =>
                `${i + 1}. **${item.name}**\n   Brand: ${item.brand || 'N/A'}\n   Price: ${item.price || 'N/A'}${item.discount ? `\n   Discount: ${item.discount}` : ''}\n   URL: ${item.url}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} groceries for "${validated.query}":\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching for groceries: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_favorites',
      description: GET_FAVORITES_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const goodEggsClient = await getClient();
          const results = await goodEggsClient.getFavorites();

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No favorite items found. Add items to your favorites on Good Eggs to see them here.',
                },
              ],
            };
          }

          const formattedResults = results
            .map(
              (item, i) =>
                `${i + 1}. **${item.name}**\n   Brand: ${item.brand || 'N/A'}\n   Price: ${item.price || 'N/A'}\n   URL: ${item.url}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} favorite items:\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting favorites: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_grocery_details',
      description: GET_GROCERY_DETAILS_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          grocery_url: {
            type: 'string',
            description: 'The Good Eggs URL of the grocery item to get details for',
          },
        },
        required: ['grocery_url'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = GetGroceryDetailsSchema.parse(args);
          const goodEggsClient = await getClient();
          const details = await goodEggsClient.getGroceryDetails(validated.grocery_url);

          const lines = [
            `**${details.name}**`,
            `Brand: ${details.brand || 'N/A'}`,
            `Price: ${details.price || 'N/A'}`,
          ];

          if (details.originalPrice) {
            lines.push(`Original Price: ${details.originalPrice}`);
          }
          if (details.discount) {
            lines.push(`Discount: ${details.discount}`);
          }
          if (details.description) {
            lines.push(`\nDescription: ${details.description}`);
          }
          if (details.productDetails) {
            lines.push(`\nProduct Details: ${details.productDetails}`);
          }
          if (details.availability && details.availability.length > 0) {
            lines.push(`\nAvailable for delivery: ${details.availability.join(', ')}`);
          }
          lines.push(`\nURL: ${details.url}`);

          return {
            content: [
              {
                type: 'text',
                text: lines.join('\n'),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting grocery details: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'add_to_cart',
      description: ADD_TO_CART_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          grocery_url: {
            type: 'string',
            description: 'The Good Eggs URL of the grocery item to add to cart',
          },
          quantity: {
            type: 'number',
            description: 'Quantity to add (default: 1)',
          },
        },
        required: ['grocery_url'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = AddToCartSchema.parse(args);
          const goodEggsClient = await getClient();
          const result = await goodEggsClient.addToCart(validated.grocery_url, validated.quantity);

          return {
            content: [
              {
                type: 'text',
                text: result.success ? result.message : `Failed to add to cart: ${result.message}`,
              },
            ],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error adding to cart: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'search_for_freebie_groceries',
      description: SEARCH_FREEBIE_GROCERIES_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const goodEggsClient = await getClient();
          const results = await goodEggsClient.searchFreebieGroceries();

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No free items or deals currently available.',
                },
              ],
            };
          }

          const formattedResults = results
            .map(
              (item, i) =>
                `${i + 1}. **${item.name}**\n   Brand: ${item.brand || 'N/A'}\n   Price: ${item.price || 'N/A'}\n   Discount: ${item.discount || 'N/A'}\n   URL: ${item.url}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} deals/freebies:\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error searching for freebies: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_list_of_past_order_dates',
      description: GET_PAST_ORDER_DATES_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const goodEggsClient = await getClient();
          const orders = await goodEggsClient.getPastOrderDates();

          if (orders.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No past orders found.',
                },
              ],
            };
          }

          const formattedResults = orders
            .map((order, i) => {
              const parts = [`${i + 1}. **${order.date}**`];
              if (order.total) parts.push(`   Total: ${order.total}`);
              if (order.itemCount) parts.push(`   Items: ${order.itemCount}`);
              return parts.join('\n');
            })
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${orders.length} past orders:\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting past order dates: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'get_past_order_groceries',
      description: GET_PAST_ORDER_GROCERIES_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          past_order_date: {
            type: 'string',
            description: 'The date of the past order to get groceries from (e.g., "2024-01-15")',
          },
        },
        required: ['past_order_date'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = GetPastOrderGroceriesSchema.parse(args);
          const goodEggsClient = await getClient();
          const results = await goodEggsClient.getPastOrderGroceries(validated.past_order_date);

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No items found for order on ${validated.past_order_date}. Make sure the date matches exactly.`,
                },
              ],
            };
          }

          const formattedResults = results
            .map(
              (item, i) =>
                `${i + 1}. **${item.name}**\n   Brand: ${item.brand || 'N/A'}\n   Quantity Ordered: ${item.quantityOrdered || 1}\n   Unit: ${item.quantity || 'N/A'}\n   Price: ${item.price || 'N/A'}\n   URL: ${item.url}`
            )
            .join('\n\n');

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} items from order on ${validated.past_order_date}:\n\n${formattedResults}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting past order groceries: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'add_favorite',
      description: ADD_FAVORITE_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          grocery_url: {
            type: 'string',
            description: 'The Good Eggs URL of the grocery item to add to favorites',
          },
        },
        required: ['grocery_url'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = AddFavoriteSchema.parse(args);
          const goodEggsClient = await getClient();
          const result = await goodEggsClient.addFavorite(validated.grocery_url);

          return {
            content: [
              {
                type: 'text',
                text: result.success
                  ? result.message
                  : `Failed to add to favorites: ${result.message}`,
              },
            ],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error adding to favorites: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'remove_favorite',
      description: REMOVE_FAVORITE_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          grocery_url: {
            type: 'string',
            description: 'The Good Eggs URL of the grocery item to remove from favorites',
          },
        },
        required: ['grocery_url'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = RemoveFavoriteSchema.parse(args);
          const goodEggsClient = await getClient();
          const result = await goodEggsClient.removeFavorite(validated.grocery_url);

          return {
            content: [
              {
                type: 'text',
                text: result.success
                  ? result.message
                  : `Failed to remove from favorites: ${result.message}`,
              },
            ],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error removing from favorites: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'remove_from_cart',
      description: REMOVE_FROM_CART_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          grocery_url: {
            type: 'string',
            description: 'The Good Eggs URL of the grocery item to remove from cart',
          },
        },
        required: ['grocery_url'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = RemoveFromCartSchema.parse(args);
          const goodEggsClient = await getClient();
          const result = await goodEggsClient.removeFromCart(validated.grocery_url);

          return {
            content: [
              {
                type: 'text',
                text: result.success
                  ? result.message
                  : `Failed to remove from cart: ${result.message}`,
              },
            ],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error removing from cart: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
  ];

  return (server: Server) => {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
    });
  };
}
