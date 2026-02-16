import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { FlightsClientFactory } from '../server.js';

export const FindAirportCodeSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Search query: city name, airport name, or partial IATA code (e.g., "San Francisco", "Heathrow", "LAX")'
    ),
});

export function findAirportCodeTool(_server: Server, clientFactory: FlightsClientFactory) {
  return {
    name: 'find_airport_code',
    description: `Look up airport IATA codes by city name, airport name, or partial code.

Use this to find the correct airport code before calling search_flights or get_date_grid.

Returns matching airports with their IATA code, full name, city, and country.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'City name, airport name, or partial code (e.g., "San Francisco", "Heathrow", "LAX")',
        },
      },
      required: ['query'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = FindAirportCodeSchema.parse(args);

        const client = clientFactory();
        const results = await client.findAirportCode(parsed.query);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query: parsed.query,
                  results: [],
                  message: `No airports found matching "${parsed.query}". Try a different spelling or a broader search.`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ query: parsed.query, results }),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error finding airport code: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
