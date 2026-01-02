import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID where the thread exists (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  thread_ts:
    'The timestamp of the parent message that started the thread (e.g., "1234567890.123456"). ' +
    'This is shown as "ts" in message outputs.',
  reply_limit:
    'Maximum number of replies to return. Default: 50. Maximum: 200. ' +
    'The parent message is always included.',
} as const;

export const GetThreadSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  thread_ts: z.string().min(1).describe(PARAM_DESCRIPTIONS.thread_ts),
  reply_limit: z.number().min(1).max(200).default(50).describe(PARAM_DESCRIPTIONS.reply_limit),
});

const TOOL_DESCRIPTION = `Get a thread conversation with all its replies.

Returns the parent message and all replies in a thread. This is equivalent to clicking on "X replies" in Slack to expand a thread.

**Returns:**
- Parent message with full content
- All reply messages in chronological order
- Reactions on each message
- Timestamps for each message

**Use cases:**
- Read an entire threaded conversation
- Get context before replying to a thread
- Review discussion history on a topic
- Find the latest reply timestamp for adding new replies

**Note:** The thread_ts parameter is the timestamp of the parent message, not a reply.`;

export function getThreadTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_get_thread',
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
        reply_limit: {
          type: 'number',
          default: 50,
          minimum: 1,
          maximum: 200,
          description: PARAM_DESCRIPTIONS.reply_limit,
        },
      },
      required: ['channel_id', 'thread_ts'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetThreadSchema.parse(args);
        const client = clientFactory();

        const { messages, hasMore } = await client.getThread(parsed.channel_id, parsed.thread_ts, {
          limit: parsed.reply_limit,
        });

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'Thread not found or has no messages.',
              },
            ],
          };
        }

        // First message is the parent
        const parent = messages[0];
        const replies = messages.slice(1);

        let output = `# Thread in channel ${parsed.channel_id}\n\n`;

        // Format parent message
        const parentTime = new Date(parseFloat(parent.ts) * 1000).toISOString();
        const parentSender = parent.user || parent.bot_id || 'unknown';
        const parentReactions = parent.reactions
          ? `\nReactions: ${parent.reactions.map((r) => `:${r.name}: ${r.count}`).join(' ')}`
          : '';

        output += `## Parent Message\n`;
        output += `**${parentSender}** (${parentTime})\n`;
        output += `${parent.text}${parentReactions}\n`;
        output += `ts: ${parent.ts}\n\n`;

        // Format replies
        if (replies.length > 0) {
          output += `## Replies (${replies.length}${hasMore ? '+' : ''}):\n\n`;

          for (const reply of replies) {
            const time = new Date(parseFloat(reply.ts) * 1000).toISOString();
            const sender = reply.user || reply.bot_id || 'unknown';
            const reactions = reply.reactions
              ? `\nReactions: ${reply.reactions.map((r) => `:${r.name}: ${r.count}`).join(' ')}`
              : '';

            output += `**${sender}** (${time})\n`;
            output += `${reply.text}${reactions}\n`;
            output += `ts: ${reply.ts}\n\n`;
          }

          if (hasMore) {
            output += `_More replies available. Increase reply_limit to see more._\n`;
          }
        } else {
          output += '_No replies yet._\n';
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
              text: `Error fetching thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
