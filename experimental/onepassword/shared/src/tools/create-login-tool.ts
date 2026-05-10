import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import { IOnePasswordClient } from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import { readOnePasswordElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  vaultId: 'The ID of the vault to create the login in.',
  title: 'The title/name for the login item.',
  username: 'The username for the login.',
  password: 'The password for the login.',
  url: 'Optional URL associated with this login.',
  tags: 'Optional array of tags to organize the item.',
} as const;

const LoginItemSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  username: z.string().min(1).describe(PARAM_DESCRIPTIONS.username),
  password: z.string().min(1).describe(PARAM_DESCRIPTIONS.password),
  url: z.string().url().optional().describe(PARAM_DESCRIPTIONS.url),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
});

export const CreateLoginSchema = z.object({
  items: z
    .array(LoginItemSchema)
    .min(1, { message: 'items must contain at least one login to create' })
    .describe(
      'Array of login items to create. Provide all logins for the batch in a single call so the user only has to approve once.'
    ),
});

const TOOL_DESCRIPTION = `Create one or more login items in 1Password in a single call. Bulk calls require only one user approval, so prefer bulk whenever you anticipate provisioning multiple logins in a session.

When you know in advance that you'll need multiple logins (e.g., onboarding several accounts at once), bundle them into one \`items\` array instead of firing sequential per-login calls — sequential calls force a separate approval prompt for each item.

Stores username/password credentials in the specified vaults. Optionally include URLs and tags for organization.

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\`
  (\`success\`, \`error\`, \`declined\`, or \`expired\`) and either the created item or an error message.
- Partial failures are surfaced per item — a single bad item does not abort the batch.

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- Store new login credentials (one or many at once)
- Save generated passwords with their associated accounts
- Create credentials for new services or accounts

**Note:** Passwords are passed as CLI arguments which may briefly appear in process lists.`;

interface LoginResult {
  index: number;
  status: 'success' | 'error' | 'declined' | 'expired';
  item?: ReturnType<typeof sanitizeItemDetails>;
  error?: string;
}

function summarizeLoginItem(item: z.infer<typeof LoginItemSchema>, index: number): string {
  const lines: string[] = [
    `  ${index + 1}. ${item.title} (vault: ${item.vaultId})`,
    `     Username: ${item.username}`,
  ];
  if (item.url) lines.push(`     URL: ${item.url}`);
  if (item.tags?.length) lines.push(`     Tags: ${item.tags.join(', ')}`);
  return lines.join('\n');
}

/**
 * Tool for creating login items in bulk.
 */
export function createLoginTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_login',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of login items to create. Provide all logins for the batch in a single call so the user only has to approve once.',
          items: {
            type: 'object',
            properties: {
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
              title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
              username: { type: 'string', description: PARAM_DESCRIPTIONS.username },
              password: { type: 'string', description: PARAM_DESCRIPTIONS.password },
              url: { type: 'string', description: PARAM_DESCRIPTIONS.url },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: PARAM_DESCRIPTIONS.tags,
              },
            },
            required: ['vaultId', 'title', 'username', 'password'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = CreateLoginSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const summary = items.map((it, i) => summarizeLoginItem(it, i)).join('\n');
          const noun = items.length === 1 ? 'login item' : `${items.length} login items`;
          const confirmation = await requestConfirmation(
            {
              server,
              message: `About to create ${noun} in 1Password:\n${summary}\n`,
              requestedSchema: createConfirmationSchema(
                items.length === 1 ? 'Create this login?' : `Create all ${items.length} logins?`,
                'Confirm that you want to create these login items in 1Password. Approving covers the entire batch.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_create_login',
              },
            },
            elicitConfig.base
          );

          if (confirmation.action !== 'accept') {
            const status: 'declined' | 'expired' =
              confirmation.action === 'expired' ? 'expired' : 'declined';
            const results: LoginResult[] = items.map((_, index) => ({ index, status }));
            return {
              content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
              isError: status === 'expired',
            };
          }

          // Defense-in-depth: some MCP clients may return action='accept' without the
          // user explicitly checking the confirmation checkbox.
          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            const results: LoginResult[] = items.map((_, index) => ({ index, status: 'declined' }));
            return {
              content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
            };
          }
        }

        const client = clientFactory();
        const results: LoginResult[] = [];
        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const created = await client.createLogin(
              it.vaultId,
              it.title,
              it.username,
              it.password,
              it.url,
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
              text: `Error creating logins: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
