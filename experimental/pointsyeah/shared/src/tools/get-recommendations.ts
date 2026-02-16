import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IPointsYeahClient } from '../server.js';

const PARAM_DESCRIPTIONS = {
  departure: 'Origin airport or city code for deal recommendations. Examples: "SFO", "NYC", "LAX".',
} as const;

const FLIGHT_DESCRIPTION = `Get flight deal recommendations from PointsYeah Explorer.

Retrieves curated award flight deals and sweet spots from a given departure city. These are deals that PointsYeah has identified as particularly good value.

**Returns:** JSON data with recommended flight deals including routes, programs, and point costs.

**Use cases:**
- Discover the best award flight deals from your home airport
- Find sweet spots in airline loyalty programs
- Get inspiration for upcoming trips based on point value`;

const HOTEL_DESCRIPTION = `Get hotel deal recommendations from PointsYeah Explorer.

Retrieves curated hotel award deals and sweet spots. These are hotel redemptions that PointsYeah has identified as particularly good value.

**Returns:** JSON data with recommended hotel deals.

**Use cases:**
- Discover the best hotel point redemptions
- Find hotel sweet spots in loyalty programs
- Get inspiration for hotel bookings using points`;

const EXPLORER_COUNT_DESCRIPTION = `Get the total count of deals available in the PointsYeah Explorer.

Returns the number of currently available flight and hotel deals in the Explorer section.

**Returns:** JSON data with the count of available deals.

**Use cases:**
- Check how many deals are currently available
- Monitor deal availability over time`;

const FlightRecommendationsSchema = z.object({
  departure: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.departure),
});

const HotelRecommendationsSchema = z.object({
  departure: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.departure),
});

export function getFlightRecommendationsTool(
  _server: Server,
  clientFactory: () => IPointsYeahClient
) {
  return {
    name: 'get_flight_recommendations',
    description: FLIGHT_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        departure: { type: 'string', description: PARAM_DESCRIPTIONS.departure },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const params = FlightRecommendationsSchema.parse(args);
        const client = clientFactory();
        const recommendations = await client.getFlightRecommendations(
          params.departure ? { departure: params.departure } : undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(recommendations, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching flight recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

export function getHotelRecommendationsTool(
  _server: Server,
  clientFactory: () => IPointsYeahClient
) {
  return {
    name: 'get_hotel_recommendations',
    description: HOTEL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        departure: { type: 'string', description: PARAM_DESCRIPTIONS.departure },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const params = HotelRecommendationsSchema.parse(args);
        const client = clientFactory();
        const recommendations = await client.getHotelRecommendations(
          params.departure ? { departure: params.departure } : undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(recommendations, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching hotel recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

export function getExplorerCountTool(_server: Server, clientFactory: () => IPointsYeahClient) {
  return {
    name: 'get_explorer_count',
    description: EXPLORER_COUNT_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();
        const count = await client.getExplorerCount();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(count, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching explorer count: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
