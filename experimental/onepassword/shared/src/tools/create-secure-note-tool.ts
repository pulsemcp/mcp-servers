import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import { IOnePasswordClient } from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import { readOnePasswordElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  vaultId: 'The ID of the vault to create the secure note in.',
  title: 'The title/name for the secure note.',
  content: 'The content/text to store in the secure note.',
  tags: 'Optional array of tags to organize the item.',
} as const;

const SecureNoteItemSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  content: z.string().min(1).describe(PARAM_DESCRIPTIONS.content),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
});

export const CreateSecureNoteSchema = z.object({
  items: z
    .array(SecureNoteItemSchema)
    .min(1, { message: 'items must contain at least one secure note to create' })
    .describe(
      'Array of secure notes to create. Provide all notes for the batch in a single call so the user only has to approve once.'
    ),
});

const TOOL_DESCRIPTION = `Create one or more secure notes in 1Password in a single call. Bulk calls require only one user approval, so prefer bulk whenever you anticipate creating multiple notes in a session.

When you know in advance that you'll need multiple notes (e.g., storing several configuration secrets at once), bundle them into one \`items\` array instead of firing sequential per-note calls — sequential calls force a separate approval prompt for each item.

Stores arbitrary text content securely. Useful for API keys, tokens, certificates, or any secret that doesn't fit the login format.

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\`
  (\`success\`, \`error\`, \`declined\`, or \`expired\`) and either the created item or an error message.
- Partial failures are surfaced per item — a single bad item does not abort the batch.

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- Store API keys and tokens (one or many at once)
- Save configuration secrets
- Keep certificates or private keys
- Store any sensitive text information

**Note:** Note contents are passed as CLI arguments which may briefly appear in process lists.`;

interface SecureNoteResult {
  index: number;
  status: 'success' | 'error' | 'declined' | 'expired';
  item?: ReturnType<typeof sanitizeItemDetails>;
  error?: string;
}

function summarizeSecureNoteItem(
  item: z.infer<typeof SecureNoteItemSchema>,
  index: number
): string {
  const lines: string[] = [`  ${index + 1}. ${item.title} (vault: ${item.vaultId})`];
  if (item.tags?.length) lines.push(`     Tags: ${item.tags.join(', ')}`);
  return lines.join('\n');
}

/**
 * Tool for creating secure notes in bulk.
 */
export function createSecureNoteTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_secure_note',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of secure notes to create. Provide all notes for the batch in a single call so the user only has to approve once.',
          items: {
            type: 'object',
            properties: {
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
              title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
              content: { type: 'string', description: PARAM_DESCRIPTIONS.content },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: PARAM_DESCRIPTIONS.tags,
              },
            },
            required: ['vaultId', 'title', 'content'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = CreateSecureNoteSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const summary = items.map((it, i) => summarizeSecureNoteItem(it, i)).join('\n');
          const noun = items.length === 1 ? 'secure note' : `${items.length} secure notes`;
          const confirmation = await requestConfirmation(
            {
              server,
              message: `About to create ${noun} in 1Password:\n${summary}\n`,
              requestedSchema: createConfirmationSchema(
                items.length === 1
                  ? 'Create this secure note?'
                  : `Create all ${items.length} secure notes?`,
                'Confirm that you want to create these secure notes in 1Password. Approving covers the entire batch.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_create_secure_note',
              },
            },
            elicitConfig.base
          );

          if (confirmation.action !== 'accept') {
            const status: 'declined' | 'expired' =
              confirmation.action === 'expired' ? 'expired' : 'declined';
            const results: SecureNoteResult[] = items.map((_, index) => ({ index, status }));
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
            const results: SecureNoteResult[] = items.map((_, index) => ({
              index,
              status: 'declined',
            }));
            return {
              content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
            };
          }
        }

        const client = clientFactory();
        const results: SecureNoteResult[] = [];
        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const created = await client.createSecureNote(
              it.vaultId,
              it.title,
              it.content,
              it.tags
            );
            results.push({ index, status: 'success', item: sanitizeItemDetails(created) });
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
              text: `Error creating secure notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
