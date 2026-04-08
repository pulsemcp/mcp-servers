import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { getHeader } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  count: 'Maximum number of drafts to return. Default: 10. Max: 100.',
  thread_id:
    'Filter drafts by thread ID. Only returns drafts belonging to the specified conversation thread. ' +
    'Get thread IDs from list_email_conversations or get_email_conversation.',
} as const;

export const ListDraftEmailsSchema = z.object({
  count: z.number().positive().max(100).default(10).describe(PARAM_DESCRIPTIONS.count),
  thread_id: z.string().optional().describe(PARAM_DESCRIPTIONS.thread_id),
});

const TOOL_DESCRIPTION = `List draft emails from Gmail.

**Parameters:**
- count: Maximum number of drafts to return (default: 10, max: 100)
- thread_id: Filter drafts by conversation thread ID (optional)

**Use cases:**
- Discover existing drafts before creating a new one
- Find a draft ID to pass to upsert_draft_email for updating
- Check which drafts exist for a specific email conversation

**Note:** Use the returned draft IDs with upsert_draft_email to update drafts, or with send_email's from_draft_id to send them.`;

export function listDraftEmailsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_draft_emails',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.count,
        },
        thread_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.thread_id,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListDraftEmailsSchema.parse(args ?? {});
        const client = clientFactory();

        // Fetch drafts — request more than needed if filtering by thread
        // since the Gmail API doesn't support server-side thread filtering for drafts
        const fetchCount = parsed.thread_id ? 100 : parsed.count;
        const { drafts } = await client.listDrafts({ maxResults: fetchCount });

        if (drafts.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No drafts found.',
              },
            ],
          };
        }

        // Fetch full draft details to get headers (subject, to, etc.)
        const fullDrafts = await Promise.all(drafts.map((d) => client.getDraft(d.id)));

        // Filter by thread_id if specified
        let filtered = fullDrafts;
        if (parsed.thread_id) {
          filtered = fullDrafts.filter((d) => d.message.threadId === parsed.thread_id);
        }

        // Apply count limit after filtering
        filtered = filtered.slice(0, parsed.count);

        if (filtered.length === 0) {
          let noResultsText = parsed.thread_id
            ? `No drafts found for thread ${parsed.thread_id}.`
            : 'No drafts found.';
          if (parsed.thread_id && drafts.length >= 100) {
            noResultsText +=
              '\n\n*Note: Only the most recent 100 drafts were searched. The draft may exist beyond this limit.*';
          }
          return {
            content: [
              {
                type: 'text',
                text: noResultsText,
              },
            ],
          };
        }

        let responseText = `Found ${filtered.length} draft(s):\n`;

        for (const draft of filtered) {
          const subject = getHeader(draft.message, 'Subject') || '(No Subject)';
          const to = getHeader(draft.message, 'To') || '(No Recipient)';

          responseText += `\n---\n`;
          responseText += `**Draft ID:** ${draft.id}\n`;
          responseText += `**Thread ID:** ${draft.message.threadId}\n`;
          responseText += `**To:** ${to}\n`;
          responseText += `**Subject:** ${subject}\n`;
          if (draft.message.snippet) {
            responseText += `**Preview:** ${draft.message.snippet}\n`;
          }
        }

        responseText +=
          '\n---\n\nUse upsert_draft_email with a draft_id to update a draft, or send_email with from_draft_id to send one.';

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing drafts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
