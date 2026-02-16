import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPointsYeahClient } from '../server.js';

const TOOL_DESCRIPTION = `Get past flight search history from PointsYeah.

Retrieves the user's previous award flight searches, showing what routes and dates they've searched for in the past.

**Returns:** JSON data with past search parameters and timestamps.

**Use cases:**
- Review previous searches to avoid duplicating effort
- Check what routes have been explored recently
- Track search patterns over time`;

export function getSearchHistoryTool(_server: Server, clientFactory: () => IPointsYeahClient) {
  return {
    name: 'get_search_history',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();
        const history = await client.getSearchHistory();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching search history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
