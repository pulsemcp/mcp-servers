import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AeroApiClientFactory } from '../server.js';

const ISO_DATETIME_DESC =
  'ISO 8601 timestamp (e.g., "2026-06-30T00:00:00Z"). AeroAPI accepts a window up to ~10 days wide.';

export const SearchFlightsByIdentSchema = z.object({
  ident: z
    .string()
    .min(2)
    .describe(
      'Flight identifier to look up: an airline flight number (ICAO "UAL123" or IATA "UA123"), an aircraft registration / tail number (e.g., "N12345"), or an fa_flight_id.'
    ),
  ident_type: z
    .enum(['designator', 'registration', 'fa_flight_id'])
    .optional()
    .describe(
      'Optional hint for how to interpret `ident`: "designator" (flight number), "registration" (tail number), or "fa_flight_id". Omit to let AeroAPI infer.'
    ),
  start: z
    .string()
    .optional()
    .describe(`Optional start of the search window. ${ISO_DATETIME_DESC}`),
  end: z.string().optional().describe(`Optional end of the search window. ${ISO_DATETIME_DESC}`),
  max_pages: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe(
      'Maximum number of result pages to fetch (default: 1). Each page costs an API query.'
    ),
});

export function searchFlightsByIdentTool(_server: Server, clientFactory: AeroApiClientFactory) {
  return {
    name: 'search_flights_by_ident',
    description: `Look up flights and their live/scheduled status by flight number, tail number, or fa_flight_id using FlightAware AeroAPI.

Use this to answer "where is flight UA123?" or "what's the status of N12345's next flight?". Returns one entry per matching operation (a flight number can map to multiple dated operations).

**Returns:** For each flight — fa_flight_id (use it with get_flight_track), operator and flight number, origin/destination airports, scheduled/estimated/actual gate and runway times (out/off/on/in), departure and arrival delays in seconds, progress percent, status text, gates/terminals, aircraft type, and cancelled/diverted flags.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        ident: {
          type: 'string',
          description:
            'Flight number (e.g., "UAL123" or "UA123"), registration/tail number (e.g., "N12345"), or fa_flight_id',
        },
        ident_type: {
          type: 'string',
          enum: ['designator', 'registration', 'fa_flight_id'],
          description: 'Optional hint for interpreting `ident`',
        },
        start: { type: 'string', description: 'Optional ISO 8601 start of search window' },
        end: { type: 'string', description: 'Optional ISO 8601 end of search window' },
        max_pages: {
          type: 'number',
          description: 'Maximum result pages to fetch (default: 1)',
        },
      },
      required: ['ident'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SearchFlightsByIdentSchema.parse(args);
        const client = clientFactory();
        const result = await client.searchFlightsByIdent(parsed);
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
