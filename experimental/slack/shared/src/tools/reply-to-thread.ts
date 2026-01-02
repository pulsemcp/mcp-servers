import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID where the thread exists (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  thread_ts:
    'The timestamp of the parent message to reply to (e.g., "1234567890.123456"). ' +
    'This creates a threaded reply under that message.',
  text:
    'The reply content. Supports Slack markdown formatting: ' +
    '*bold*, _italic_, `code`, ```code blocks```, and <URL|link text>.',
  broadcast:
    'Also post the reply to the channel (not just the thread). Default: false. ' +
    'When true, the reply appears both in the thread and as a channel message.',
} as const;

export const ReplyToThreadSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  thread_ts: z.string().min(1).describe(PARAM_DESCRIPTIONS.thread_ts),
  text: z.string().min(1).describe(PARAM_DESCRIPTIONS.text),
  broadcast: z.boolean().default(false).describe(PARAM_DESCRIPTIONS.broadcast),
});

const TOOL_DESCRIPTION = `Reply to an existing thread in Slack.

Posts a message as a reply to a specific thread. The reply will appear nested under the parent message.

**Returns:**
- Confirmation of the posted reply
- The reply's timestamp (ts) for further operations

**Use cases:**
- Continue a threaded conversation
- Answer a question in a thread
- Provide follow-up information
- Keep discussions organized within threads

**Note:** Use slack_get_thread first to read the conversation before replying.`;

export function replyToThreadTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_reply_to_thread',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        thread_ts: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.thread_ts,
        },
        text: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.text,
        },
        broadcast: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.broadcast,
        },
      },
      required: ['channel_id', 'thread_ts', 'text'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ReplyToThreadSchema.parse(args);
        const client = clientFactory();

        const message = await client.postMessage(parsed.channel_id, parsed.text, {
          threadTs: parsed.thread_ts,
          replyBroadcast: parsed.broadcast,
        });

        const time = new Date(parseFloat(message.ts) * 1000).toISOString();

        return {
          content: [
            {
              type: 'text',
              text:
                `Reply posted successfully!\n\n` +
                `Channel: ${parsed.channel_id}\n` +
                `Thread: ${parsed.thread_ts}\n` +
                `Reply timestamp: ${message.ts}\n` +
                `Posted at: ${time}\n` +
                (parsed.broadcast ? 'Broadcasted to channel: Yes\n' : '') +
                `\nContent:\n${parsed.text}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error posting reply: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
