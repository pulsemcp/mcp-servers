import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { AeroApiClientFactory } from '../server.js';

export const GetFlightTrackSchema = z.object({
  fa_flight_id: z
    .string()
    .min(1)
    .describe(
      'The fa_flight_id of the flight to track, obtained from a search_flights_by_ident result.'
    ),
  include_estimated_positions: z
    .boolean()
    .optional()
    .describe(
      'When true, include estimated/interpolated positions in addition to received ones (default: false).'
    ),
});

export function getFlightTrackTool(_server: Server, clientFactory: AeroApiClientFactory) {
  return {
    name: 'get_flight_track',
    description: `Get the recorded position track (the flown path) for a single flight via FlightAware AeroAPI.

First call search_flights_by_ident to obtain an fa_flight_id, then pass it here.

**Returns:** actual_distance flown and an array of position fixes, each with latitude, longitude, altitude (hundreds of feet), altitude_change, groundspeed (knots), heading, timestamp, and update type.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        fa_flight_id: {
          type: 'string',
          description: 'fa_flight_id from a search_flights_by_ident result',
        },
        include_estimated_positions: {
          type: 'boolean',
          description: 'Include estimated positions (default: false)',
        },
      },
      required: ['fa_flight_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetFlightTrackSchema.parse(args);
        const client = clientFactory();
        const result = await client.getFlightTrack(parsed);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting flight track: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
