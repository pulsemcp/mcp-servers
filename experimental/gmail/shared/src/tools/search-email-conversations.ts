import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatEmail } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  query:
    'Gmail search query. Supports all Gmail search operators. ' +
    'Examples: "from:user@example.com", "subject:meeting", "is:unread", "has:attachment", ' +
    '"after:2024/01/01", "before:2024/12/31", "in:inbox", "newer_than:7d".',
  count: 'Maximum number of results to return. Default: 10. Max: 100.',
} as const;

export const SearchEmailConversationsSchema = z.object({
  query: z.string().min(1).describe(PARAM_DESCRIPTIONS.query),
  count: z.number().positive().max(100).default(10).describe(PARAM_DESCRIPTIONS.count),
});

const TOOL_DESCRIPTION = `Search email conversations using Gmail's powerful search syntax.

**Parameters:**
- query: Gmail search query (required)
- count: Maximum results to return (default: 10, max: 100)

**Search operators:**
- from:user@example.com - Emails from specific sender
- to:user@example.com - Emails sent to specific recipient
- subject:keyword - Emails with keyword in subject
- is:unread / is:read - Unread or read emails
- is:starred - Starred emails
- has:attachment - Emails with attachments
- filename:pdf - Emails with specific attachment type
- after:2024/01/01 - Emails after a date
- before:2024/12/31 - Emails before a date
- newer_than:7d - Emails from the last 7 days
- older_than:1m - Emails older than 1 month
- in:inbox / in:sent / in:drafts - Emails in specific folder
- label:work - Emails with specific label
- "exact phrase" - Search for exact phrase

**Combining operators:**
- Use spaces to AND operators: "from:alice is:unread"
- Use OR for alternatives: "from:alice OR from:bob"
- Use - to exclude: "subject:meeting -subject:canceled"

**Returns:**
A formatted list of matching emails with ID, Thread ID, Subject, From, Date, and snippet.

**Note:** Use get_email_conversation with an email ID to retrieve full message content.`;

export function searchEmailConversationsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'search_email_conversations',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
        count: {
          type: 'number',
          default: 10,
          description: PARAM_DESCRIPTIONS.count,
        },
      },
      required: ['query'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SearchEmailConversationsSchema.parse(args ?? {});
        const client = clientFactory();

        // Search messages using the query
        const { messages } = await client.listMessages({
          q: parsed.query,
          maxResults: parsed.count,
        });

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No emails found matching query: "${parsed.query}"`,
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

        const formattedEmails = emailDetails.map(formatEmail).join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${messages.length} email(s) matching "${parsed.query}":\n\n${formattedEmails}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
