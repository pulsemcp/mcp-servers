import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AeroApiClientFactory } from '../server.js';

export const GetAirportFlightsSchema = z.object({
  id: z
    .string()
    .min(3)
    .describe('Airport identifier: ICAO (e.g., "KSFO"), IATA (e.g., "SFO"), or LID code.'),
  type: z
    .enum(['Airline', 'GeneralAviation'])
    .optional()
    .describe('Optional filter by flight category: "Airline" or "GeneralAviation".'),
  start: z
    .string()
    .optional()
    .describe('Optional ISO 8601 start of the time window (e.g., "2026-06-30T00:00:00Z").'),
  end: z
    .string()
    .optional()
    .describe('Optional ISO 8601 end of the time window (e.g., "2026-06-30T12:00:00Z").'),
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

export function getAirportFlightsTool(_server: Server, clientFactory: AeroApiClientFactory) {
  return {
    name: 'get_airport_flights',
    description: `Get the flight board (arrivals, departures, and scheduled flights) for an airport via FlightAware AeroAPI.

Use this for "what flights are departing SFO?" or "show arrivals into KORD". For per-airport delay summaries use get_airport_delays.

**Returns:** Four arrays — arrivals, departures, scheduled_arrivals, scheduled_departures — each a list of flights with operator, flight number, origin/destination, times, delays, gates, and status.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'Airport ICAO (e.g., "KSFO"), IATA (e.g., "SFO"), or LID code',
        },
        type: {
          type: 'string',
          enum: ['Airline', 'GeneralAviation'],
          description: 'Optional filter by flight category',
        },
        start: { type: 'string', description: 'Optional ISO 8601 start of time window' },
        end: { type: 'string', description: 'Optional ISO 8601 end of time window' },
        max_pages: { type: 'number', description: 'Maximum result pages to fetch (default: 1)' },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetAirportFlightsSchema.parse(args);
        const client = clientFactory();
        const result = await client.getAirportFlights(parsed);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting airport flights: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
