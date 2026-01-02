import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID to post the message to (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  text:
    'The message content to post. Supports Slack markdown formatting: ' +
    '*bold*, _italic_, `code`, ```code blocks```, and <URL|link text>.',
} as const;

export const PostMessageSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  text: z.string().min(1).describe(PARAM_DESCRIPTIONS.text),
});

const TOOL_DESCRIPTION = `Post a new message to a Slack channel.

Creates a new message in the specified channel. The message appears as a new post, not as a reply to any thread.

**Returns:**
- Confirmation of the posted message
- The message timestamp (ts) which can be used to:
  - Start a thread by replying with slack_reply_to_thread
  - Edit the message with slack_update_message
  - Add reactions with slack_react_to_message

**Use cases:**
- Share information with a channel
- Start a new discussion topic
- Post announcements or updates
- Ask questions to the channel

**Note:** To reply to an existing thread, use slack_reply_to_thread instead.`;

export function postMessageTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_post_message',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        text: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.text,
        },
      },
      required: ['channel_id', 'text'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = PostMessageSchema.parse(args);
        const client = clientFactory();

        const message = await client.postMessage(parsed.channel_id, parsed.text);

        const time = new Date(parseFloat(message.ts) * 1000).toISOString();

        return {
          content: [
            {
              type: 'text',
              text:
                `Message posted successfully!\n\n` +
                `Channel: ${parsed.channel_id}\n` +
                `Timestamp: ${message.ts}\n` +
                `Posted at: ${time}\n\n` +
                `Content:\n${parsed.text}\n\n` +
                `Use the timestamp (ts: ${message.ts}) to reply to this message or add reactions.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error posting message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
