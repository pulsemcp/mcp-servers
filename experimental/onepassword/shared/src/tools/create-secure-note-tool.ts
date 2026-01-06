import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient } from '../types.js';

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
- The created item with all its details including the generated ID

**Use cases:**
- Store API keys and tokens
- Save configuration secrets
- Keep certificates or private keys
- Store any sensitive text information

**Note:** The content is passed as a CLI argument which may briefly appear in process lists.`;

/**
 * Tool for creating secure notes
 */
export function createSecureNoteTool(_server: Server, clientFactory: () => IOnePasswordClient) {
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
        const client = clientFactory();
        const item = await client.createSecureNote(
          validatedArgs.vaultId,
          validatedArgs.title,
          validatedArgs.content,
          validatedArgs.tags
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(item, null, 2),
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
