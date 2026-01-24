import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatEmail } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  count: 'Maximum number of email conversations to return. Default: 10. Max: 100.',
  labels:
    'Comma-separated list of label IDs to filter by. Default: INBOX. ' +
    'Common labels: INBOX, SENT, DRAFTS, SPAM, TRASH, STARRED, IMPORTANT, UNREAD.',
  sort_by:
    'Sort order for results. Default: recent. ' +
    'Options: recent (newest first), oldest (oldest first).',
  after_date:
    'Only return emails after this date. Format: YYYY-MM-DD (e.g., 2024-01-15). ' +
    'Uses Gmail query syntax internally.',
} as const;

export const ListEmailConversationsSchema = z.object({
  count: z.number().positive().max(100).default(10).describe(PARAM_DESCRIPTIONS.count),
  labels: z.string().optional().default('INBOX').describe(PARAM_DESCRIPTIONS.labels),
  sort_by: z.enum(['recent', 'oldest']).default('recent').describe(PARAM_DESCRIPTIONS.sort_by),
  after_date: z.string().optional().describe(PARAM_DESCRIPTIONS.after_date),
});

const TOOL_DESCRIPTION = `List email conversations from Gmail.

Returns a list of email conversations with their subject, sender, date, and a snippet preview. Use get_email_conversation to retrieve the full content of a specific conversation.

**Parameters:**
- count: Maximum conversations to return (default: 10, max: 100)
- labels: Which labels/folders to search (default: INBOX)
- sort_by: Sort order - "recent" (newest first) or "oldest" (default: recent)
- after_date: Only return emails after this date (format: YYYY-MM-DD)

**Returns:**
A formatted list of email conversations with:
- Email ID (needed for get_email_conversation)
- Thread ID
- Subject line
- Sender (From)
- Date received
- Snippet preview

**Use cases:**
- Check recent inbox activity
- List emails from specific labels like SENT or STARRED
- Get oldest emails first for processing backlogs
- Filter emails by date range

**Note:** This tool only returns email metadata and snippets. Use get_email_conversation with an email ID to retrieve the full message content.`;

export function listEmailConversationsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_email_conversations',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'number',
          default: 10,
          description: PARAM_DESCRIPTIONS.count,
        },
        labels: {
          type: 'string',
          default: 'INBOX',
          description: PARAM_DESCRIPTIONS.labels,
        },
        sort_by: {
          type: 'string',
          enum: ['recent', 'oldest'],
          default: 'recent',
          description: PARAM_DESCRIPTIONS.sort_by,
        },
        after_date: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.after_date,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListEmailConversationsSchema.parse(args ?? {});
        const client = clientFactory();

        // Parse labels
        const labelIds = parsed.labels.split(',').map((l) => l.trim().toUpperCase());

        // Build query string for date filtering
        let query: string | undefined;
        if (parsed.after_date) {
          // Convert YYYY-MM-DD to YYYY/MM/DD for Gmail query syntax
          query = `after:${parsed.after_date.replace(/-/g, '/')}`;
        }

        // List messages
        const { messages } = await client.listMessages({
          maxResults: parsed.count,
          labelIds,
          q: query,
        });

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No email conversations found with labels: ${labelIds.join(', ')}`,
              },
            ],
          };
        }

        // Fetch full details for each message
        const emailDetails = await Promise.all(
          messages.map((msg) =>
            client.getMessage(msg.id, {
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date'],
            })
          )
        );

        // Sort based on sort_by parameter
        const sortedEmails = [...emailDetails].sort((a, b) => {
          const dateA = parseInt(a.internalDate, 10);
          const dateB = parseInt(b.internalDate, 10);
          return parsed.sort_by === 'recent' ? dateB - dateA : dateA - dateB;
        });

        const formattedEmails = sortedEmails.map(formatEmail).join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${messages.length} email conversation(s):\n\n${formattedEmails}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing email conversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
