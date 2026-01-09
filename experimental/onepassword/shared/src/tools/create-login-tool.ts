import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import {
  IOnePasswordClient,
  OnePasswordItemDetails,
  OnePasswordSafeItemDetails,
  OnePasswordSafeField,
} from '../types.js';

const PARAM_DESCRIPTIONS = {
  vaultId: 'The ID of the vault to create the login in.',
  title: 'The title/name for the login item.',
  username: 'The username for the login.',
  password: 'The password for the login.',
  url: 'Optional URL associated with this login.',
  tags: 'Optional array of tags to organize the item.',
} as const;

export const CreateLoginSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  username: z.string().min(1).describe(PARAM_DESCRIPTIONS.username),
  password: z.string().min(1).describe(PARAM_DESCRIPTIONS.password),
  url: z.string().url().optional().describe(PARAM_DESCRIPTIONS.url),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
});

const TOOL_DESCRIPTION = `Create a new login item in 1Password.

Stores username/password credentials in the specified vault. Optionally include a URL and tags for organization.

**Returns:**
- The created item with its details (title, category, vault name)

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- Store new login credentials
- Save generated passwords with their associated accounts
- Create credentials for new services or accounts

**Note:** The password is passed as a CLI argument which may briefly appear in process lists.`;

/**
 * Sanitize item details by removing all internal IDs
 */
function sanitizeItemDetails(item: OnePasswordItemDetails): OnePasswordSafeItemDetails {
  return {
    title: item.title,
    category: item.category,
    vault: {
      name: item.vault.name,
    },
    tags: item.tags,
    fields: item.fields?.map(
      (f): OnePasswordSafeField => ({
        type: f.type,
        purpose: f.purpose,
        label: f.label,
        value: f.value,
      })
    ),
    urls: item.urls,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Tool for creating login items
 */
export function createLoginTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_login',
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
        username: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.username,
        },
        password: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.password,
        },
        url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.url,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
      },
      required: ['vaultId', 'title', 'username', 'password'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateLoginSchema.parse(args);
        const client = clientFactory();
        const item = await client.createLogin(
          validatedArgs.vaultId,
          validatedArgs.title,
          validatedArgs.username,
          validatedArgs.password,
          validatedArgs.url,
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
              text: `Error creating login: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
