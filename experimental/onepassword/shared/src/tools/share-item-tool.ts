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

const ShareItemItemSchema = z
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

export const ShareItemSchema = z.object({
  items: z
    .array(ShareItemItemSchema)
    .min(1, { message: 'items must contain at least one item to share' })
    .describe(
      'Array of items to share. Always pass every share you plan to mint in a single call — the user is prompted once for the whole batch. Calling this tool repeatedly with one item per call subjects the user to a stream of approval prompts and should be avoided.'
    ),
});

const TOOL_DESCRIPTION = `Create one or more shareable links for 1Password items in a single call.

**BATCH ALL SHARES INTO ONE CALL.** This tool is gated by a single user approval that covers the entire \`items\` array. Calling it once with N items shows the user one prompt listing all N share requests; calling it N times forces N separate approval prompts seconds apart, which is annoying and error-prone for the user.

**Plan up front, then call once.** Before invoking this tool, decide every share you intend to mint for the current workflow and pass them all in one \`items\` array. Even if it feels natural to share items "as you go" during a multi-step task (e.g., share one credential, do other work, share the next), pause and accumulate the list — issue a single bulk call near the end of the planning phase rather than peppering the user with mid-task confirmations.

**Anti-patterns (do NOT do this):**
- Looping over a list of items and calling \`onepassword_share_item\` once per iteration.
- Asking the user for one share, then later "while we're at it" asking for another.
- Splitting a known-up-front batch into multiple calls because the items came from different sources.

Wraps \`op item share\` to mint a URL anyone with the link can open, unless \`emails\`
is set (in which case only those recipients can open it). Useful for handing a
one-time credential to a customer without giving them a full 1Password account.

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\`
  (\`success\`, \`error\`, \`declined\`, or \`expired\`) and either the share payload
  (\`share_url\`, \`expires_at\`, \`created_at\`) or an error message.
- Partial failures are surfaced per item — a single bad item does not abort the batch.

**Security Note:** Share links expose the item's contents to anyone who opens the URL
(subject to the \`emails\` and \`view_once\` controls). Treat the returned URLs as
sensitive material.`;

interface ShareItemPayload {
  share_url?: string;
  expires_at?: string;
  created_at?: string;
}

interface ShareItemResult {
  index: number;
  status: 'success' | 'error' | 'declined' | 'expired';
  share?: ShareItemPayload;
  error?: string;
}

function summarizeShareItem(item: z.infer<typeof ShareItemItemSchema>, index: number): string {
  const lines: string[] = [`  ${index + 1}. ${item.item}`];
  if (item.vault) lines.push(`     Vault: ${item.vault}`);
  if (item.expires_in) lines.push(`     Expires in: ${item.expires_in}`);
  if (item.emails?.length) lines.push(`     Emails: ${item.emails.join(', ')}`);
  if (item.view_once) lines.push(`     View once: yes`);
  return lines.join('\n');
}

/**
 * Tool for sharing 1Password items in bulk.
 */
export function shareItemTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_share_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of items to share. Always pass every share you plan to mint in a single call — the user is prompted once for the whole batch. Calling this tool repeatedly with one item per call subjects the user to a stream of approval prompts and should be avoided.',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string', description: PARAM_DESCRIPTIONS.item },
              vault: { type: 'string', description: PARAM_DESCRIPTIONS.vault },
              expires_in: { type: 'string', description: PARAM_DESCRIPTIONS.expires_in },
              emails: {
                type: 'array',
                items: { type: 'string' },
                description: PARAM_DESCRIPTIONS.emails,
              },
              view_once: { type: 'boolean', description: PARAM_DESCRIPTIONS.view_once },
            },
            required: ['item'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = ShareItemSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const summary = items.map((it, i) => summarizeShareItem(it, i)).join('\n');
          const noun = items.length === 1 ? 'share link' : `${items.length} share links`;
          const confirmation = await requestConfirmation(
            {
              server,
              message: `About to create ${noun} for 1Password items:\n${summary}\n`,
              requestedSchema: createConfirmationSchema(
                items.length === 1
                  ? 'Create this share link?'
                  : `Create all ${items.length} share links?`,
                'Confirm that you want to mint 1Password share URLs for these items. Approving covers the entire batch.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_share_item',
              },
            },
            elicitConfig.base
          );

          if (confirmation.action !== 'accept') {
            const status: 'declined' | 'expired' =
              confirmation.action === 'expired' ? 'expired' : 'declined';
            const results: ShareItemResult[] = items.map((_, index) => ({ index, status }));
            return {
              content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
              isError: status === 'expired',
            };
          }

          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            const results: ShareItemResult[] = items.map((_, index) => ({
              index,
              status: 'declined',
            }));
            return {
              content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
            };
          }
        }

        const client = clientFactory();
        const results: ShareItemResult[] = [];
        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const share = await client.shareItem(it.item, it.vault, {
              expiresIn: it.expires_in,
              emails: it.emails,
              viewOnce: it.view_once,
            });
            results.push({ index, status: 'success', share });
          } catch (error) {
            results.push({
              index,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating share links: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
