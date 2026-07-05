import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AeroApiClientFactory } from '../server.js';

export const GetAirportInfoSchema = z.object({
  id: z
    .string()
    .min(3)
    .describe(
      'Airport identifier: ICAO code (e.g., "KSFO"), IATA code (e.g., "SFO"), or LID. ICAO is the most reliable.'
    ),
});

export function getAirportInfoTool(_server: Server, clientFactory: AeroApiClientFactory) {
  return {
    name: 'get_airport_info',
    description: `Get general information about an airport via FlightAware AeroAPI.

**Returns:** Airport name, ICAO/IATA/LID codes, type, elevation, city/state, latitude/longitude, timezone, country code, and Wikipedia URL.`,
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
        const parsed = GetAirportInfoSchema.parse(args);
        const client = clientFactory();
        const result = await client.getAirportInfo(parsed);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting airport info: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
