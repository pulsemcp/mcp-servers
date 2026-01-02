import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  include_private:
    'Include private channels the bot is a member of. Default: true. ' +
    'Set to false to only list public channels.',
  include_archived:
    'Include archived channels. Default: false. ' +
    'Archived channels are read-only and cannot receive new messages.',
} as const;

export const GetChannelsSchema = z.object({
  include_private: z.boolean().default(true).describe(PARAM_DESCRIPTIONS.include_private),
  include_archived: z.boolean().default(false).describe(PARAM_DESCRIPTIONS.include_archived),
});

const TOOL_DESCRIPTION = `List all Slack channels the bot has access to.

Returns a list of public and private channels in the workspace that the bot can see. Each channel includes its ID, name, topic, purpose, and member count.

**Returns:**
A formatted list of channels with their key details including:
- Channel ID (needed for other operations)
- Channel name
- Topic and purpose
- Whether the channel is private or archived
- Number of members

**Use cases:**
- Discover available channels to read or post to
- Find a specific channel's ID for subsequent operations
- Get an overview of the workspace's channel structure

**Note:** The bot can only see channels it has been invited to (for private channels) or all public channels.`;

export function getChannelsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_get_channels',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        include_private: {
          type: 'boolean',
          default: true,
          description: PARAM_DESCRIPTIONS.include_private,
        },
        include_archived: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.include_archived,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetChannelsSchema.parse(args ?? {});
        const client = clientFactory();

        const types = parsed.include_private ? 'public_channel,private_channel' : 'public_channel';

        const channels = await client.getChannels({
          types,
          excludeArchived: !parsed.include_archived,
        });

        if (channels.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No channels found. The bot may not have access to any channels yet.',
              },
            ],
          };
        }

        const channelList = channels
          .map((ch) => {
            const flags = [];
            if (ch.is_private) flags.push('private');
            if (ch.is_archived) flags.push('archived');
            if (ch.is_general) flags.push('general');

            const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
            const topic = ch.topic?.value ? `\n   Topic: ${ch.topic.value}` : '';
            const purpose = ch.purpose?.value ? `\n   Purpose: ${ch.purpose.value}` : '';
            const members = ch.num_members !== undefined ? `\n   Members: ${ch.num_members}` : '';

            return `• #${ch.name}${flagStr}\n   ID: ${ch.id}${topic}${purpose}${members}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${channels.length} channel(s):\n\n${channelList}`,
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
