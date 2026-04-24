import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import { IOnePasswordClient } from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import { readOnePasswordElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  vaultId: 'The ID of the vault to create the API Credential item in.',
  title: 'The title/name for the API credential item.',
  credential: 'The raw API key / token / secret value to store in the credential field.',
  username: 'Optional username associated with the credential (e.g. a tenant slug).',
  hostname: 'Optional hostname associated with the credential (e.g. "api.pulsemcp.com").',
  expires: 'Optional expiration date in YYYY-MM-DD format.',
  valid_from: 'Optional start date in YYYY-MM-DD format (when the credential becomes valid).',
  tags: 'Optional array of tags to organize the item.',
  notes: 'Optional free-form notes to attach to the item.',
} as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const CreateApiCredentialSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  credential: z.string().min(1).describe(PARAM_DESCRIPTIONS.credential),
  username: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.username),
  hostname: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.hostname),
  expires: z
    .string()
    .regex(DATE_REGEX, { message: 'expires must be in YYYY-MM-DD format' })
    .optional()
    .describe(PARAM_DESCRIPTIONS.expires),
  valid_from: z
    .string()
    .regex(DATE_REGEX, { message: 'valid_from must be in YYYY-MM-DD format' })
    .optional()
    .describe(PARAM_DESCRIPTIONS.valid_from),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
  notes: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.notes),
});

const TOOL_DESCRIPTION = `Create a new API Credential item in 1Password.

Stores API keys, tokens, or other machine credentials in 1Password's built-in
"API Credential" category — which is preferable to a Secure Note because
consumers (humans and tooling) can recognize it as a credential and surface
fields like \`username\`, \`hostname\`, \`expires\`, and \`valid from\` correctly.

**Returns:**
- The created item with its details (title, category, vault name)

**Security Note:** Item IDs are intentionally omitted from the response.

**Note:** The credential value is passed as a CLI argument which may briefly
appear in process lists.`;

/**
 * Tool for creating API Credential items.
 */
export function createApiCredentialTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_api_credential',
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
        credential: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.credential,
        },
        username: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.username,
        },
        hostname: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.hostname,
        },
        expires: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.expires,
        },
        valid_from: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.valid_from,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
        notes: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.notes,
        },
      },
      required: ['vaultId', 'title', 'credential'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateApiCredentialSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const lines: string[] = [
            `About to create an API Credential item in 1Password:`,
            `  Title: ${validatedArgs.title}`,
          ];
          if (validatedArgs.username) {
            lines.push(`  Username: ${validatedArgs.username}`);
          }
          if (validatedArgs.hostname) {
            lines.push(`  Hostname: ${validatedArgs.hostname}`);
          }
          if (validatedArgs.valid_from) {
            lines.push(`  Valid from: ${validatedArgs.valid_from}`);
          }
          if (validatedArgs.expires) {
            lines.push(`  Expires: ${validatedArgs.expires}`);
          }
          if (validatedArgs.tags) {
            lines.push(`  Tags: ${validatedArgs.tags.join(', ')}`);
          }

          const confirmation = await requestConfirmation(
            {
              server,
              message: lines.join('\n') + '\n',
              requestedSchema: createConfirmationSchema(
                'Create this API credential?',
                'Confirm that you want to create this API Credential item in 1Password.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_create_api_credential',
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
                    text: 'API credential creation confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'API credential creation was cancelled by the user.',
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
                  text: 'API credential creation was not confirmed.',
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const item = await client.createApiCredential(
          validatedArgs.vaultId,
          validatedArgs.title,
          validatedArgs.credential,
          {
            username: validatedArgs.username,
            hostname: validatedArgs.hostname,
            expires: validatedArgs.expires,
            validFrom: validatedArgs.valid_from,
            notes: validatedArgs.notes,
            tags: validatedArgs.tags,
          }
        );

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
              text: `Error creating API credential: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
