import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for listing all channels in the workspace
 */
export function getChannelsTool(server: Server, clientFactory: ClientFactory) {
  // No input parameters needed for this tool
  const GetChannelsSchema = z.object({});

  return {
    name: 'get_channels',
    description: `List all channels in your Twist workspace. Channels are the primary way to organize conversations in Twist, similar to channels in Slack or rooms in other chat applications. This tool retrieves all channels you have access to in the configured workspace.

Example response:
Found 5 active channels:

- #general (ID: 123456) - General team discussions
- #engineering (ID: 123457) - Engineering team updates
- #product (ID: 123458) - Product development discussions
- #support (ID: 123459)
- #random (ID: 123460) - Off-topic conversations

Use cases:
- Discovering available channels when first setting up Twist integration
- Finding channel IDs needed for other operations like creating threads
- Auditing channel structure and organization
- Getting an overview of team communication structure
- Identifying channels for specific projects or teams`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args: unknown) => {
      // Validate args (even though we expect no parameters)
      GetChannelsSchema.parse(args);

      const client = clientFactory();

      try {
        const channels = await client.getChannels();

        // Format the response in a user-friendly way
        const channelList = channels
          .filter((ch) => !ch.archived) // Only show active channels
          .map(
            (ch) => `- #${ch.name} (ID: ${ch.id})${ch.description ? ` - ${ch.description}` : ''}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${channels.filter((ch) => !ch.archived).length} active channels:\n\n${channelList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
