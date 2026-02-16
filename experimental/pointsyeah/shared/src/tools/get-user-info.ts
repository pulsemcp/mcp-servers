import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPointsYeahClient } from '../server.js';

const MEMBERSHIP_DESCRIPTION = `Get the current user's PointsYeah membership information.

Retrieves details about the user's subscription plan, account status, and any premium features.

**Returns:** JSON data with membership details including plan type and status.

**Use cases:**
- Check current subscription level
- Verify account status
- Understand what features are available`;

const PREFERENCES_DESCRIPTION = `Get the current user's PointsYeah preferences.

Retrieves saved user preferences such as default cabin class, preferred airlines, and home airports.

**Returns:** JSON data with user preference settings.

**Use cases:**
- Check saved airline and cabin preferences
- Review default search settings
- Understand user's travel preferences`;

export function getUserMembershipTool(_server: Server, clientFactory: () => IPointsYeahClient) {
  return {
    name: 'get_user_membership',
    description: MEMBERSHIP_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();
        const membership = await client.getUserMembership();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(membership, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching membership info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

export function getUserPreferencesTool(_server: Server, clientFactory: () => IPointsYeahClient) {
  return {
    name: 'get_user_preferences',
    description: PREFERENCES_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();
        const preferences = await client.getUserPreferences();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(preferences, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
