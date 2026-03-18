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

export const CreateSecureNoteSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  content: z.string().min(1).describe(PARAM_DESCRIPTIONS.content),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
});

const TOOL_DESCRIPTION = `Create a new secure note in 1Password.

Stores arbitrary text content securely. Useful for API keys, tokens, certificates, or any secret that doesn't fit the login format.

**Returns:**
- The created item with its details (title, category, vault name)

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- Store API keys and tokens
- Save configuration secrets
- Keep certificates or private keys
- Store any sensitive text information

**Note:** The content is passed as a CLI argument which may briefly appear in process lists.`;

/**
 * Tool for creating secure notes
 */
export function createSecureNoteTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_secure_note',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        vaultId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vaultId,
        },
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
      },
      required: ['vaultId', 'title', 'content'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateSecureNoteSchema.parse(args);

        // Check if write elicitation is enabled
        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const confirmMessage =
            `About to create a secure note in 1Password:\n` +
            `  Title: ${validatedArgs.title}\n` +
            (validatedArgs.tags ? `  Tags: ${validatedArgs.tags.join(', ')}\n` : '');

          const confirmation = await requestConfirmation(
            {
              server,
              message: confirmMessage,
              requestedSchema: createConfirmationSchema(
                'Create this secure note?',
                'Confirm that you want to create this secure note in 1Password.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_create_secure_note',
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
                    text: 'Secure note creation confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'Secure note creation was cancelled by the user.',
                },
              ],
            };
          }

          // Defense-in-depth: some MCP clients may return action='accept' without the
          // user explicitly checking the confirmation checkbox. Guard against this edge case.
          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Secure note creation was not confirmed.',
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const item = await client.createSecureNote(
          validatedArgs.vaultId,
          validatedArgs.title,
          validatedArgs.content,
          validatedArgs.tags
        );

        // Sanitize response to remove IDs
        const sanitizedItem = sanitizeItemDetails(item);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizedItem, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating secure note: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
