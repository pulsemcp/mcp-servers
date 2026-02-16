import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { FlightsClientFactory } from '../server.js';

export const SearchFlightsSchema = z.object({
  origin: z.string().min(3).max(3).describe('Origin airport IATA code (e.g., "SFO", "JFK", "LHR")'),
  destination: z
    .string()
    .min(3)
    .max(3)
    .describe('Destination airport IATA code (e.g., "LAX", "LHR", "NRT")'),
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Departure date in YYYY-MM-DD format'),
  return_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Return date in YYYY-MM-DD format (required for round_trip)'),
  trip_type: z.enum(['one_way', 'round_trip']).default('one_way').describe('Trip type'),
  seat_class: z
    .enum(['economy', 'premium_economy', 'business', 'first'])
    .default('economy')
    .describe('Cabin class'),
  adults: z.number().int().min(1).max(9).default(1).describe('Number of adult passengers'),
  children: z.number().int().min(0).max(9).default(0).describe('Number of child passengers'),
  infants_in_seat: z
    .number()
    .int()
    .min(0)
    .max(9)
    .default(0)
    .describe('Number of infants with their own seat'),
  infants_on_lap: z.number().int().min(0).max(9).default(0).describe('Number of infants on lap'),
  max_stops: z
    .enum(['any', 'nonstop', '1', '2'])
    .default('any')
    .describe('Maximum number of stops. "any" for no filter, "nonstop" for direct flights only'),
  sort_by: z
    .enum(['best', 'price', 'duration', 'departure', 'arrival'])
    .default('best')
    .describe('Sort order for results'),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum number of results to return (for pagination)'),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('Offset for pagination (skip this many results)'),
  currency: z
    .string()
    .min(3)
    .max(3)
    .default('USD')
    .describe('Currency code for prices (e.g., "USD", "EUR", "GBP")'),
});

export function searchFlightsTool(_server: Server, clientFactory: FlightsClientFactory) {
  return {
    name: 'search_flights',
    description: `Search for flights on Google Flights with full filtering and pagination.

Returns structured flight data including prices, airlines, times, durations, stops, and individual flight segments with aircraft type and legroom.

IMPORTANT — Handling large result sets: Popular routes often return 50-150+ flights. If total_results is high, recommend narrowing with filters (max_stops, sort_by, seat_class) rather than paginating through everything. For example, set max_stops to "nonstop" or sort_by to "price" to surface the most relevant options quickly.

Pagination: The response includes has_more (boolean) and next_offset (number or null). To get the next page, call search_flights again with the same parameters but set offset to next_offset. Keep paginating while has_more is true. Each page returns up to max_results flights.

Use find_airport_code first if you need to look up IATA airport codes.
Use get_date_grid to find the cheapest dates before searching.`,
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
          description: 'Departure date in YYYY-MM-DD format',
        },
        return_date: {
          type: 'string',
          description: 'Return date in YYYY-MM-DD (required for round_trip)',
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
        children: {
          type: 'number',
          description: 'Number of child passengers (default: 0)',
        },
        infants_in_seat: {
          type: 'number',
          description: 'Number of infants with own seat (default: 0)',
        },
        infants_on_lap: {
          type: 'number',
          description: 'Number of infants on lap (default: 0)',
        },
        max_stops: {
          type: 'string',
          enum: ['any', 'nonstop', '1', '2'],
          description: 'Max stops filter (default: any)',
        },
        sort_by: {
          type: 'string',
          enum: ['best', 'price', 'duration', 'departure', 'arrival'],
          description: 'Sort order (default: best)',
        },
        max_results: {
          type: 'number',
          description: 'Max results per page, 1-50 (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default: 0)',
        },
        currency: {
          type: 'string',
          description: 'Currency code for prices (default: USD)',
        },
      },
      required: ['origin', 'destination', 'departure_date'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SearchFlightsSchema.parse(args);

        // Validate round trip has return date
        if (parsed.trip_type === 'round_trip' && !parsed.return_date) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: return_date is required when trip_type is "round_trip"',
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();
        const result = await client.searchFlights(parsed);

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error searching flights: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
