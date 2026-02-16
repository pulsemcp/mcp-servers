import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SerpApiClientFactory } from '../server.js';

export const SearchHotelsSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        'Hotel search query, just like you would type into Google Hotels (e.g., "Hotels in New York", "Hotels near Times Square", "Beach resorts in Cancun")'
      ),
    check_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Check-in date in YYYY-MM-DD format'),
    check_out_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Check-out date in YYYY-MM-DD format'),
    adults: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(2)
      .describe('Number of adult guests (default: 2)'),
    children: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(0)
      .describe('Number of children (default: 0)'),
    children_ages: z
      .string()
      .optional()
      .describe('Comma-separated ages of children, 1-17 (e.g., "5,8,12")'),
    currency: z
      .string()
      .min(3)
      .max(3)
      .default('USD')
      .describe('Currency code for prices (e.g., "USD", "EUR", "GBP")'),
    gl: z
      .string()
      .min(2)
      .max(2)
      .optional()
      .describe('Country code for localization (e.g., "us", "uk", "fr")'),
    hl: z.string().min(2).max(2).optional().describe('Language code (e.g., "en", "es", "fr")'),
    sort_by: z
      .number()
      .int()
      .optional()
      .describe('Sort order: 3 = lowest price, 8 = highest rating, 13 = most reviewed'),
    min_price: z.number().int().min(0).optional().describe('Minimum price per night filter'),
    max_price: z.number().int().min(0).optional().describe('Maximum price per night filter'),
    rating: z
      .number()
      .int()
      .optional()
      .describe('Minimum rating filter: 7 = 3.5+, 8 = 4.0+, 9 = 4.5+'),
    hotel_class: z
      .string()
      .optional()
      .describe('Star rating filter, comma-separated (e.g., "4,5" for 4 and 5 star hotels)'),
    free_cancellation: z.boolean().optional().describe('Filter for hotels with free cancellation'),
    special_offers: z.boolean().optional().describe('Filter for hotels with special offers'),
    eco_certified: z.boolean().optional().describe('Filter for eco-certified hotels'),
    vacation_rentals: z
      .boolean()
      .optional()
      .describe('Search for vacation rentals instead of hotels'),
    next_page_token: z
      .string()
      .optional()
      .describe('Pagination token from a previous search result to get the next page'),
  })
  .refine((data) => data.check_out_date > data.check_in_date, {
    message: 'check_out_date must be after check_in_date',
    path: ['check_out_date'],
  });

export function searchHotelsTool(_server: Server, clientFactory: SerpApiClientFactory) {
  return {
    name: 'search_hotels',
    description: `Search for hotels using Google Hotels via SerpAPI.

Returns a list of hotels with prices, ratings, reviews, amenities, and booking information for a given location and date range.

**Pagination:** The response includes a next_page_token. To get more results, call search_hotels again with the same parameters plus the next_page_token value.

**Sorting:** Use sort_by to order results: 3 = lowest price, 8 = highest rating, 13 = most reviewed.

**Filtering:** Narrow results by price range, star rating, minimum review rating, free cancellation, and more.

**Use get_hotel_details** with a property_token from the results to get detailed pricing, reviews breakdown, and full amenity lists for a specific hotel.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Hotel search query (e.g., "Hotels in New York", "Beach resorts in Cancun")',
        },
        check_in_date: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
        check_out_date: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
        adults: { type: 'number', description: 'Number of adult guests (default: 2)' },
        children: { type: 'number', description: 'Number of children (default: 0)' },
        children_ages: {
          type: 'string',
          description: 'Comma-separated children ages, 1-17 (e.g., "5,8,12")',
        },
        currency: { type: 'string', description: 'Currency code (default: USD)' },
        gl: { type: 'string', description: 'Country code for localization (e.g., "us")' },
        hl: { type: 'string', description: 'Language code (e.g., "en")' },
        sort_by: {
          type: 'number',
          description: 'Sort: 3 = lowest price, 8 = highest rating, 13 = most reviewed',
        },
        min_price: { type: 'number', description: 'Minimum price per night' },
        max_price: { type: 'number', description: 'Maximum price per night' },
        rating: {
          type: 'number',
          description: 'Minimum rating: 7 = 3.5+, 8 = 4.0+, 9 = 4.5+',
        },
        hotel_class: {
          type: 'string',
          description: 'Star rating filter, comma-separated (e.g., "4,5")',
        },
        free_cancellation: { type: 'boolean', description: 'Filter for free cancellation' },
        special_offers: { type: 'boolean', description: 'Filter for special offers' },
        eco_certified: { type: 'boolean', description: 'Filter for eco-certified hotels' },
        vacation_rentals: {
          type: 'boolean',
          description: 'Search for vacation rentals instead of hotels',
        },
        next_page_token: { type: 'string', description: 'Pagination token for next page' },
      },
      required: ['query', 'check_in_date', 'check_out_date'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SearchHotelsSchema.parse(args);

        const client = clientFactory();
        const result = await client.searchHotels(parsed);

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error searching hotels: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
