import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID where the message exists (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  message_ts:
    'The timestamp of the message to react to (e.g., "1234567890.123456"). ' +
    'This is shown as "ts" in message outputs.',
  emoji:
    'The emoji name without colons (e.g., "thumbsup", "white_check_mark", "eyes"). ' +
    'Common reactions: thumbsup, thumbsdown, heart, eyes, white_check_mark, x, tada.',
} as const;

export const ReactToMessageSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  message_ts: z.string().min(1).describe(PARAM_DESCRIPTIONS.message_ts),
  emoji: z.string().min(1).describe(PARAM_DESCRIPTIONS.emoji),
});

const TOOL_DESCRIPTION = `Add an emoji reaction to a message in Slack.

Adds a reaction (emoji) to a specific message. Reactions are a lightweight way to acknowledge or respond to messages without creating a new message.

**Returns:**
- Confirmation that the reaction was added

**Common emoji names:**
- Positive: thumbsup, +1, heart, tada, star, clap
- Acknowledgment: eyes, white_check_mark, ok_hand
- Negative: thumbsdown, -1, x
- Status: hourglass, warning, question, exclamation

**Use cases:**
- Acknowledge that you've seen a message (:eyes:)
- Mark a task as complete (:white_check_mark:)
- Show approval or agreement (:thumbsup:)
- Celebrate achievements (:tada:)
- Signal that something needs attention (:warning:)

**Note:** If the reaction already exists from this bot, no error is returned.`;

export function reactToMessageTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_react_to_message',
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
        emoji: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.emoji,
        },
      },
      required: ['channel_id', 'message_ts', 'emoji'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ReactToMessageSchema.parse(args);
        const client = clientFactory();

        // Remove colons if the user included them
        const emojiName = parsed.emoji.replace(/^:/, '').replace(/:$/, '');

        await client.addReaction(parsed.channel_id, parsed.message_ts, emojiName);

        return {
          content: [
            {
              type: 'text',
              text:
                `Reaction added successfully!\n\n` +
                `Channel: ${parsed.channel_id}\n` +
                `Message: ${parsed.message_ts}\n` +
                `Reaction: :${emojiName}:`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding reaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
