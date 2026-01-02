import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID where the message exists (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  message_ts:
    'The timestamp of the message to update (e.g., "1234567890.123456"). ' +
    'This is shown as "ts" in message outputs.',
  text:
    'The new content for the message. Completely replaces the existing text. ' +
    'Supports Slack markdown: *bold*, _italic_, `code`, ```code blocks```.',
} as const;

export const UpdateMessageSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  message_ts: z.string().min(1).describe(PARAM_DESCRIPTIONS.message_ts),
  text: z.string().min(1).describe(PARAM_DESCRIPTIONS.text),
});

const TOOL_DESCRIPTION = `Update an existing message in Slack.

Modifies the content of a message that was previously posted. The message will show an "(edited)" indicator after being updated.

**Returns:**
- Confirmation of the update
- The updated message content

**Use cases:**
- Fix typos or errors in a message
- Update information that has changed
- Add clarifications to a previous message
- Mark a task or question as resolved by editing the message

**Note:**
- You can only edit messages that the bot posted
- The edit history is not preserved - only the final content is shown
- Consider adding reactions instead if you just want to acknowledge a message`;

export function updateMessageTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_update_message',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        message_ts: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.message_ts,
        },
        text: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.text,
        },
      },
      required: ['channel_id', 'message_ts', 'text'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = UpdateMessageSchema.parse(args);
        const client = clientFactory();

        const message = await client.updateMessage(
          parsed.channel_id,
          parsed.message_ts,
          parsed.text
        );

        const time = new Date(parseFloat(message.ts) * 1000).toISOString();

        return {
          content: [
            {
              type: 'text',
              text:
                `Message updated successfully!\n\n` +
                `Channel: ${parsed.channel_id}\n` +
                `Timestamp: ${message.ts}\n` +
                `Updated at: ${time}\n\n` +
                `New content:\n${parsed.text}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
