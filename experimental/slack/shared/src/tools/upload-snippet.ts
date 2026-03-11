import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  channel_id:
    'The channel ID to share the snippet in (e.g., "C1234567890"). ' +
    'Get channel IDs using the slack_get_channels tool.',
  content:
    'The text content to upload as a snippet. Can be arbitrarily long — ' +
    'use this instead of slack_post_message when content exceeds message length limits.',
  filename:
    'Filename for the snippet (e.g., "output.txt", "error.log", "code.py"). ' +
    'Slack uses the file extension for syntax highlighting. Default: "snippet.txt".',
  title: 'Title displayed in Slack above the snippet.',
  thread_ts:
    'Post the snippet as a thread reply to this message timestamp. ' +
    'If omitted, the snippet is posted as a new message in the channel.',
} as const;

export const UploadSnippetSchema = z.object({
  channel_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.channel_id),
  content: z.string().min(1).describe(PARAM_DESCRIPTIONS.content),
  filename: z.string().optional().describe(PARAM_DESCRIPTIONS.filename),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  thread_ts: z.string().optional().describe(PARAM_DESCRIPTIONS.thread_ts),
});

const TOOL_DESCRIPTION = `Upload text content as a file snippet to a Slack channel.

Uploads content as a text file/snippet, bypassing Slack's message length limits. Use this when content is too long for slack_post_message (e.g., long URLs, logs, code, JSON payloads).

**Returns:**
- Confirmation of the uploaded snippet
- The file ID for reference

**Use cases:**
- Share very long URLs that exceed message length limits
- Post error logs, stack traces, or debug output
- Share code snippets or configuration files
- Upload large JSON or text payloads

**Note:** For short messages that fit within Slack's limits, use slack_post_message instead. Use the filename extension to control syntax highlighting (e.g., "code.py" for Python).`;

export function uploadSnippetTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_upload_snippet',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        channel_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
        filename: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.filename,
        },
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        thread_ts: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.thread_ts,
        },
      },
      required: ['channel_id', 'content'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = UploadSnippetSchema.parse(args);
        const client = clientFactory();

        const file = await client.uploadSnippet(parsed.content, {
          channelId: parsed.channel_id,
          filename: parsed.filename,
          title: parsed.title,
          threadTs: parsed.thread_ts,
        });

        const parts = [
          `Snippet uploaded successfully!\n`,
          `Channel: ${parsed.channel_id}`,
          `File ID: ${file.id}`,
        ];

        if (file.name) {
          parts.push(`Filename: ${file.name}`);
        }
        if (file.title) {
          parts.push(`Title: ${file.title}`);
        }
        if (parsed.thread_ts) {
          parts.push(`Thread: ${parsed.thread_ts}`);
        }
        if (file.permalink) {
          parts.push(`Permalink: ${file.permalink}`);
        }

        const byteLength = Buffer.from(parsed.content, 'utf-8').length;
        parts.push(`\nContent length: ${byteLength} bytes`);

        return {
          content: [
            {
              type: 'text',
              text: parts.join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error uploading snippet: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
