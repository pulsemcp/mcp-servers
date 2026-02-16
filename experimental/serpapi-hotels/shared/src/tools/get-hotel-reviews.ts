import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SerpApiClientFactory } from '../server.js';

export const GetHotelReviewsSchema = z.object({
  property_token: z
    .string()
    .min(1)
    .describe('Property token from a search_hotels result to get reviews for a specific hotel'),
  sort_by: z
    .number()
    .int()
    .optional()
    .describe(
      'Sort order: 1 = most helpful (default), 2 = most recent, 3 = highest score, 4 = lowest score'
    ),
  category_token: z
    .string()
    .optional()
    .describe(
      'Filter reviews by category (e.g., cleanliness, service). Get category tokens from the reviews_breakdown in get_hotel_details results.'
    ),
  source_number: z
    .number()
    .int()
    .optional()
    .describe('Filter by review source: 0 = all reviews (default), -1 = Google reviews only'),
  hl: z.string().min(2).max(2).optional().describe('Language code (e.g., "en", "es", "fr")'),
  next_page_token: z
    .string()
    .optional()
    .describe('Pagination token from a previous get_hotel_reviews result to get the next page'),
});

export function getHotelReviewsTool(_server: Server, clientFactory: SerpApiClientFactory) {
  return {
    name: 'get_hotel_reviews',
    description: `Get individual guest reviews for a specific hotel from Google Hotels via SerpAPI.

Use this after search_hotels to read actual review text for a hotel. Pass the property_token from a search result.

**Returns:** Individual reviews with full text snippets, ratings, sub-ratings (rooms, service, location), review dates, reviewer info, hotel highlights, and hotel management responses when available.

**Sorting:** Use sort_by to order reviews: 1 = most helpful (default), 2 = most recent, 3 = highest score, 4 = lowest score.

**Filtering:** Use category_token (from get_hotel_details reviews_breakdown) to filter by category, or source_number to filter by review source.

**Pagination:** The response includes a next_page_token. To get more reviews, call get_hotel_reviews again with the same parameters plus the next_page_token value.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        property_token: {
          type: 'string',
          description: 'Property token from search_hotels results',
        },
        sort_by: {
          type: 'number',
          description: 'Sort: 1 = most helpful (default), 2 = most recent, 3 = highest, 4 = lowest',
        },
        category_token: {
          type: 'string',
          description: 'Filter by review category (from get_hotel_details reviews_breakdown)',
        },
        source_number: {
          type: 'number',
          description: 'Filter by source: 0 = all (default), -1 = Google only',
        },
        hl: { type: 'string', description: 'Language code (e.g., "en")' },
        next_page_token: { type: 'string', description: 'Pagination token for next page' },
      },
      required: ['property_token'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetHotelReviewsSchema.parse(args);

        const client = clientFactory();
        const result = await client.getHotelReviews(parsed);

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting hotel reviews: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
