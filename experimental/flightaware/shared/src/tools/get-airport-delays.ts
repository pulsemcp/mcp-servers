import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AeroApiClientFactory } from '../server.js';

export const GetAirportDelaysSchema = z.object({
  id: z
    .string()
    .min(3)
    .describe('Airport identifier: ICAO (e.g., "KSFO"), IATA (e.g., "SFO"), or LID code.'),
});

export function getAirportDelaysTool(_server: Server, clientFactory: AeroApiClientFactory) {
  return {
    name: 'get_airport_delays',
    description: `Get current delay information for an airport via FlightAware AeroAPI.

**Returns:** The airport's overall delay category and color, total delay in seconds, and a breakdown of delay reasons (each with category, color, delay_secs, and a human-readable reason).`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'Airport ICAO (e.g., "KSFO"), IATA (e.g., "SFO"), or LID code',
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetAirportDelaysSchema.parse(args);
        const client = clientFactory();
        const result = await client.getAirportDelays(parsed);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting airport delays: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
