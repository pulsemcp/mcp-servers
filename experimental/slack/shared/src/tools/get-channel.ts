import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The unique identifier of the channel (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  include_messages:
    'Whether to include recent messages from the channel. Default: true. ' +
    'Set to false to only get channel metadata.',
  message_limit:
    'Maximum number of messages to return when include_messages is true. ' +
    'Default: 20. Maximum: 100.',
} as const;

export const GetChannelSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  include_messages: z.boolean().default(true).describe(PARAM_DESCRIPTIONS.include_messages),
  message_limit: z.number().min(1).max(100).default(20).describe(PARAM_DESCRIPTIONS.message_limit),
});

const TOOL_DESCRIPTION = `Get detailed information about a Slack channel, optionally including recent messages.

Returns channel metadata (name, topic, purpose, member count) and optionally the most recent messages. This is equivalent to opening a channel in Slack.

**Returns:**
- Channel details: name, topic, purpose, member count, creation date
- Recent messages (if include_messages is true): sender, content, timestamp, reactions, thread info

**Use cases:**
- Get context about a channel before posting
- Read recent messages to understand current discussions
- Check if a channel is active or archived
- Find threads that may need responses

**Note:** Messages are returned newest first. Thread parent messages include reply counts.`;

export function getChannelTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_get_channel',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        include_messages: {
          type: 'boolean',
          default: true,
          description: PARAM_DESCRIPTIONS.include_messages,
        },
        message_limit: {
          type: 'number',
          default: 20,
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.message_limit,
        },
      },
      required: ['channel_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetChannelSchema.parse(args);
        const client = clientFactory();

        // Get channel info
        const channel = await client.getChannel(parsed.channel_id);

        // Build channel info section
        const flags = [];
        if (channel.is_private) flags.push('private');
        if (channel.is_archived) flags.push('archived');
        if (channel.is_general) flags.push('general');

        let output = `# Channel: #${channel.name}\n`;
        if (flags.length > 0) {
          output += `Status: ${flags.join(', ')}\n`;
        }
        output += `ID: ${channel.id}\n`;
        if (channel.topic?.value) {
          output += `Topic: ${channel.topic.value}\n`;
        }
        if (channel.purpose?.value) {
          output += `Purpose: ${channel.purpose.value}\n`;
        }
        if (channel.num_members !== undefined) {
          output += `Members: ${channel.num_members}\n`;
        }
        output += `Created: ${new Date(channel.created * 1000).toISOString()}\n`;

        // Get messages if requested
        if (parsed.include_messages) {
          const { messages, hasMore } = await client.getMessages(parsed.channel_id, {
            limit: parsed.message_limit,
          });

          if (messages.length > 0) {
            output += `\n## Recent Messages (${messages.length}${hasMore ? '+' : ''}):\n\n`;

            for (const msg of messages) {
              const time = new Date(parseFloat(msg.ts) * 1000).toISOString();
              const sender = msg.user || msg.bot_id || 'unknown';
              const threadInfo = msg.reply_count ? ` [${msg.reply_count} replies]` : '';
              const reactions = msg.reactions
                ? ` | Reactions: ${msg.reactions.map((r) => `:${r.name}: ${r.count}`).join(' ')}`
                : '';

              output += `**${sender}** (${time})${threadInfo}${reactions}\n`;
              output += `${msg.text}\n`;
              if (msg.thread_ts && msg.thread_ts !== msg.ts) {
                output += `↳ Reply to thread: ${msg.thread_ts}\n`;
              }
              output += `ts: ${msg.ts}\n\n`;
            }

            if (hasMore) {
              output += `_More messages available. Increase message_limit to see more._\n`;
            }
          } else {
            output += '\n_No messages in this channel yet._\n';
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
