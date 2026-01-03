import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { Email } from '../types.js';
import { getHeader } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  hours:
    'Time horizon in hours to look back for emails. Default: 24. ' +
    'Example: 48 for the last 2 days.',
  labels:
    'Comma-separated list of label IDs to filter by. Default: INBOX. ' +
    'Common labels: INBOX, SENT, DRAFTS, SPAM, TRASH, STARRED, IMPORTANT, UNREAD.',
  max_results: 'Maximum number of emails to return. Default: 10. Max: 100.',
} as const;

export const ListRecentEmailsSchema = z.object({
  hours: z.number().positive().default(24).describe(PARAM_DESCRIPTIONS.hours),
  labels: z.string().optional().default('INBOX').describe(PARAM_DESCRIPTIONS.labels),
  max_results: z.number().positive().max(100).default(10).describe(PARAM_DESCRIPTIONS.max_results),
});

const TOOL_DESCRIPTION = `List recent emails from Gmail within a specified time horizon.

Returns a list of recent emails with their subject, sender, date, and a snippet preview. Use get_email to retrieve the full content of a specific email.

**Parameters:**
- hours: How far back to look for emails (default: 24 hours)
- labels: Which labels/folders to search (default: INBOX)
- max_results: Maximum emails to return (default: 10, max: 100)

**Returns:**
A formatted list of emails with:
- Email ID (needed for get_email)
- Subject line
- Sender (From)
- Date received
- Snippet preview

**Use cases:**
- Check recent inbox activity
- Monitor for new emails in a time window
- List recent emails from specific labels like SENT or STARRED

**Note:** This tool only returns email metadata and snippets. Use get_email with an email ID to retrieve the full message content.`;

/**
 * Formats an email for display
 */
function formatEmail(email: Email): string {
  const subject = getHeader(email, 'Subject') || '(No Subject)';
  const from = getHeader(email, 'From') || 'Unknown';
  const date = getHeader(email, 'Date') || 'Unknown date';
  const snippet = email.snippet || '';

  return `**ID:** ${email.id}
**Subject:** ${subject}
**From:** ${from}
**Date:** ${date}
**Preview:** ${snippet}`;
}

export function listRecentEmailsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'gmail_list_recent_emails',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        hours: {
          type: 'number',
          default: 24,
          description: PARAM_DESCRIPTIONS.hours,
        },
        labels: {
          type: 'string',
          default: 'INBOX',
          description: PARAM_DESCRIPTIONS.labels,
        },
        max_results: {
          type: 'number',
          default: 10,
          description: PARAM_DESCRIPTIONS.max_results,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListRecentEmailsSchema.parse(args ?? {});
        const client = clientFactory();

        // Calculate the timestamp for the time horizon
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - parsed.hours * 60 * 60 * 1000);
        const afterTimestamp = Math.floor(cutoffDate.getTime() / 1000);

        // Build the Gmail query
        const query = `after:${afterTimestamp}`;

        // Parse labels
        const labelIds = parsed.labels.split(',').map((l) => l.trim().toUpperCase());

        // List messages
        const { messages } = await client.listMessages({
          q: query,
          maxResults: parsed.max_results,
          labelIds,
        });

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No emails found in the last ${parsed.hours} hour(s) with labels: ${labelIds.join(', ')}`,
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
              text: `Found ${messages.length} email(s) in the last ${parsed.hours} hour(s):\n\n${formattedEmails}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
