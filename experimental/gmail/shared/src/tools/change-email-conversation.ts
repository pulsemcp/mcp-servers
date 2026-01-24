import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email to modify. ' +
    'Obtain this from list_email_conversations or search_email_conversations.',
  status: 'Mark the email as read, unread, or archived. ' + 'Options: read, unread, archived.',
  labels:
    'Labels to add to the email. Comma-separated list. ' +
    'Common labels: STARRED, IMPORTANT. User labels should be the label ID.',
  remove_labels:
    'Labels to remove from the email. Comma-separated list. ' +
    'Common labels: STARRED, IMPORTANT, UNREAD. User labels should be the label ID.',
  is_starred: 'Star or unstar the email. Set to true to star, false to unstar.',
} as const;

export const ChangeEmailConversationSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
  status: z.enum(['read', 'unread', 'archived']).optional().describe(PARAM_DESCRIPTIONS.status),
  labels: z.string().optional().describe(PARAM_DESCRIPTIONS.labels),
  remove_labels: z.string().optional().describe(PARAM_DESCRIPTIONS.remove_labels),
  is_starred: z.boolean().optional().describe(PARAM_DESCRIPTIONS.is_starred),
});

const TOOL_DESCRIPTION = `Modify an email conversation's status, labels, or starred state.

**Parameters:**
- email_id: The unique identifier of the email (required)
- status: Mark as "read", "unread", or "archived" (optional)
- labels: Comma-separated labels to add (optional)
- remove_labels: Comma-separated labels to remove (optional)
- is_starred: Set to true to star, false to unstar (optional)

**Label operations:**
- Adding STARRED marks the email as starred
- Removing INBOX archives the email
- Adding/removing UNREAD marks email as unread/read

**Use cases:**
- Mark an email as read/unread
- Star important emails
- Archive emails (remove from inbox)
- Apply custom labels for organization

**Note:** Get email_id from list_email_conversations or search_email_conversations first.`;

export function changeEmailConversationTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'change_email_conversation',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        email_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.email_id,
        },
        status: {
          type: 'string',
          enum: ['read', 'unread', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
        labels: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.labels,
        },
        remove_labels: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.remove_labels,
        },
        is_starred: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.is_starred,
        },
      },
      required: ['email_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ChangeEmailConversationSchema.parse(args ?? {});
        const client = clientFactory();

        const addLabelIds: string[] = [];
        const removeLabelIds: string[] = [];

        // Handle status
        if (parsed.status === 'read') {
          removeLabelIds.push('UNREAD');
        } else if (parsed.status === 'unread') {
          addLabelIds.push('UNREAD');
        } else if (parsed.status === 'archived') {
          removeLabelIds.push('INBOX');
        }

        // Handle is_starred
        if (parsed.is_starred === true) {
          addLabelIds.push('STARRED');
        } else if (parsed.is_starred === false) {
          removeLabelIds.push('STARRED');
        }

        // Handle labels to add
        if (parsed.labels) {
          const labels = parsed.labels.split(',').map((l) => l.trim());
          addLabelIds.push(...labels);
        }

        // Handle labels to remove
        if (parsed.remove_labels) {
          const labels = parsed.remove_labels.split(',').map((l) => l.trim());
          removeLabelIds.push(...labels);
        }

        // Only make API call if there are changes to make
        if (addLabelIds.length === 0 && removeLabelIds.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes specified. Provide at least one of: status, labels, remove_labels, or is_starred.',
              },
            ],
          };
        }

        const updatedEmail = await client.modifyMessage(parsed.email_id, {
          addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
          removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined,
        });

        const changes: string[] = [];
        if (addLabelIds.length > 0) {
          changes.push(`Added labels: ${addLabelIds.join(', ')}`);
        }
        if (removeLabelIds.length > 0) {
          changes.push(`Removed labels: ${removeLabelIds.join(', ')}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Email ${parsed.email_id} updated successfully.\n\n${changes.join('\n')}\n\nCurrent labels: ${updatedEmail.labelIds?.join(', ') || 'None'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error modifying email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
