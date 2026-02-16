import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { FlightsClientFactory } from '../server.js';

export const GetDateGridSchema = z.object({
  origin: z.string().min(3).max(3).describe('Origin airport IATA code (e.g., "SFO")'),
  destination: z.string().min(3).max(3).describe('Destination airport IATA code (e.g., "LAX")'),
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      'Anchor date for the grid in YYYY-MM-DD. The grid shows prices around this date. Defaults to 7 days from now.'
    ),
  trip_type: z.enum(['one_way', 'round_trip']).default('one_way').describe('Trip type'),
  seat_class: z
    .enum(['economy', 'premium_economy', 'business', 'first'])
    .default('economy')
    .describe('Cabin class'),
  adults: z.number().int().min(1).max(9).default(1).describe('Number of adult passengers'),
  currency: z
    .string()
    .min(3)
    .max(3)
    .default('USD')
    .describe('Currency code for prices (e.g., "USD", "EUR")'),
});

export function getDateGridTool(_server: Server, clientFactory: FlightsClientFactory) {
  return {
    name: 'get_date_grid',
    description: `Get a date-price grid for a route showing the lowest flight price for each day.

Returns an array of dates with their lowest prices, plus the overall cheapest date. Useful for finding the best travel dates before doing a detailed search.

The grid typically covers ~60 days around the anchor date.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        origin: { type: 'string', description: 'Origin airport IATA code (e.g., "SFO")' },
        destination: {
          type: 'string',
          description: 'Destination airport IATA code (e.g., "LAX")',
        },
        departure_date: {
          type: 'string',
          description:
            'Anchor date in YYYY-MM-DD. Grid shows prices around this date. Default: 7 days from now.',
        },
        trip_type: {
          type: 'string',
          enum: ['one_way', 'round_trip'],
          description: 'Trip type (default: one_way)',
        },
        seat_class: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
          description: 'Cabin class (default: economy)',
        },
        adults: {
          type: 'number',
          description: 'Number of adult passengers (default: 1)',
        },
        currency: {
          type: 'string',
          description: 'Currency code for prices (default: USD)',
        },
      },
      required: ['origin', 'destination'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetDateGridSchema.parse(args);

        const client = clientFactory();
        const result = await client.getDateGrid(parsed);

        if (result.date_grid.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query: { origin: parsed.origin, destination: parsed.destination },
                  date_grid: [],
                  cheapest: null,
                  currency: parsed.currency,
                  message:
                    'No date grid data available. This may happen for certain routes or date ranges.',
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query: { origin: parsed.origin, destination: parsed.destination },
                ...result,
              }),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting date grid: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
