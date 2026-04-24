import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import { IOnePasswordClient } from '../types.js';
import { readOnePasswordElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  item: 'The title or ID of the item to share. Get item titles from onepassword_list_items.',
  vault: 'Optional vault name or ID to narrow the lookup.',
  expires_in:
    'Optional expiration duration for the share link, in `op` duration syntax (e.g. "30m", "1h", "7d", "2w"). Defaults to the 1Password CLI default (7d).',
  emails:
    'Optional array of email addresses to restrict access to. When set, only recipients with these addresses can open the link.',
  view_once:
    'Optional; when true, the share link expires after being opened once. Cannot be combined with `emails` (1Password requires a specific recipient for view-once links to work).',
} as const;

export const ShareItemSchema = z
  .object({
    item: z.string().min(1).describe(PARAM_DESCRIPTIONS.item),
    vault: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.vault),
    expires_in: z
      .string()
      .min(1)
      .regex(/^\d+(s|m|h|d|w)$/i, {
        message:
          'expires_in must be a duration like "30m", "2h", "7d", or "1w" (suffix one of s/m/h/d/w)',
      })
      .optional()
      .describe(PARAM_DESCRIPTIONS.expires_in),
    emails: z.array(z.string().email()).optional().describe(PARAM_DESCRIPTIONS.emails),
    view_once: z.boolean().optional().describe(PARAM_DESCRIPTIONS.view_once),
  })
  .refine((data) => !(data.view_once && data.emails && data.emails.length > 0), {
    message:
      'view_once cannot be combined with emails; 1Password requires an email recipient to enforce a view-once policy reliably.',
    path: ['view_once'],
  });

const TOOL_DESCRIPTION = `Create a shareable link for a 1Password item.

Wraps \`op item share\` to mint a URL anyone with the link can open, unless \`emails\`
is set (in which case only those recipients can open it). Useful for handing a
one-time credential to a customer without giving them a full 1Password account.

**Returns:**
- \`share_url\`: The URL to distribute to the recipient
- \`expires_at\`: Optional — when the link stops working
- \`created_at\`: Optional — when the link was minted

**Security Note:** Share links expose the item's contents to anyone who opens the URL
(subject to the \`emails\` and \`view_once\` controls). Treat the returned URL as
sensitive material.`;

/**
 * Tool for sharing a 1Password item.
 */
export function shareItemTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_share_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        item: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.item,
        },
        vault: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vault,
        },
        expires_in: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.expires_in,
        },
        emails: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.emails,
        },
        view_once: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.view_once,
        },
      },
      required: ['item'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ShareItemSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const lines: string[] = [
            `About to create a share link for a 1Password item:`,
            `  Item: ${validatedArgs.item}`,
          ];
          if (validatedArgs.vault) {
            lines.push(`  Vault: ${validatedArgs.vault}`);
          }
          if (validatedArgs.expires_in) {
            lines.push(`  Expires in: ${validatedArgs.expires_in}`);
          }
          if (validatedArgs.emails && validatedArgs.emails.length > 0) {
            lines.push(`  Emails: ${validatedArgs.emails.join(', ')}`);
          }
          if (validatedArgs.view_once) {
            lines.push(`  View once: yes`);
          }

          const confirmation = await requestConfirmation(
            {
              server,
              message: lines.join('\n') + '\n',
              requestedSchema: createConfirmationSchema(
                'Create this share link?',
                'Confirm that you want to mint a 1Password share URL for this item.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_share_item',
              },
            },
            elicitConfig.base
          );

          if (confirmation.action !== 'accept') {
            if (confirmation.action === 'expired') {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Share link confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'Share link creation was cancelled by the user.',
                },
              ],
            };
          }

          // Defense-in-depth: some MCP clients may return action='accept' without the
          // user explicitly checking the confirmation checkbox.
          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Share link creation was not confirmed.',
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const result = await client.shareItem(validatedArgs.item, validatedArgs.vault, {
          expiresIn: validatedArgs.expires_in,
          emails: validatedArgs.emails,
          viewOnce: validatedArgs.view_once,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating share link: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
