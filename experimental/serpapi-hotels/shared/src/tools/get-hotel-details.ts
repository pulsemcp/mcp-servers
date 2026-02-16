import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { SerpApiClientFactory } from '../server.js';

export const GetHotelDetailsSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        'The same hotel search query used in search_hotels (e.g., "Hotels in New York"). Required by the SerpAPI Google Hotels engine.'
      ),
    property_token: z
      .string()
      .min(1)
      .describe('Property token from a search_hotels result to get details for a specific hotel'),
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
  })
  .refine((data) => data.check_out_date > data.check_in_date, {
    message: 'check_out_date must be after check_in_date',
    path: ['check_out_date'],
  });

export function getHotelDetailsTool(_server: Server, clientFactory: SerpApiClientFactory) {
  return {
    name: 'get_hotel_details',
    description: `Get detailed information about a specific hotel from Google Hotels via SerpAPI.

Use this after search_hotels to get full details for a specific property. Pass both the original search query and the property_token from a search result.

**Returns:** Complete hotel info including all booking prices from different sources, review sentiment breakdown (positive/negative/neutral by category like cleanliness, location, service), full amenity list, check-in/out times, nearby places with travel times, and GPS coordinates.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'The same hotel search query used in search_hotels (e.g., "Hotels in New York")',
        },
        property_token: {
          type: 'string',
          description: 'Property token from search_hotels results',
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
      },
      required: ['query', 'property_token', 'check_in_date', 'check_out_date'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetHotelDetailsSchema.parse(args);

        const client = clientFactory();
        const result = await client.getHotelDetails(parsed);

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting hotel details: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
