import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import type { ClientFactory } from '../server.js';
import { readCmsAdminElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  api_key_id:
    'The numeric ID of the API key to revoke (the `id` field returned by `create_api_key`).',
} as const;

const RevokeApiKeySchema = z.object({
  api_key_id: z.number().int().positive().describe(PARAM_DESCRIPTIONS.api_key_id),
});

const TOOL_DESCRIPTION = `Revoke an API key by ID, immediately invalidating it.

**This is a destructive operation.** Any clients still using the key will start receiving 401 Unauthorized. Revocation is idempotent — calling revoke on a non-existent or already-revoked key returns success without error.

By default, the request requires explicit user approval via MCP elicitation before being sent to the admin API.

**Use cases:**
- Roll a tenant's keys after re-issuing credentials, so the old key stops working.
- Revoke a leaked or compromised API key.
- Remove a deprecated key during cleanup.

**Parameters:**
- \`api_key_id\` (required): Numeric ID of the API key (the \`id\` field returned by \`create_api_key\`).

**Returns:**
- \`success\`: Boolean indicating whether the request succeeded.
- \`message\`: Human-readable confirmation message.`;

export function revokeApiKey(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'revoke_api_key',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        api_key_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.api_key_id,
        },
      },
      required: ['api_key_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = RevokeApiKeySchema.parse(args);

        const elicitConfig = readCmsAdminElicitationConfig();
        if (elicitConfig.destructiveElicitationEnabled) {
          const lines: string[] = [
            'About to PERMANENTLY REVOKE an API key via the PulseMCP admin API:',
            `  API key ID: ${validatedArgs.api_key_id}`,
            '',
            'Any clients still using this key will start receiving 401 Unauthorized.',
            'This action cannot be undone.',
          ];

          const confirmation = await requestConfirmation(
            {
              server,
              message: lines.join('\n') + '\n',
              requestedSchema: createConfirmationSchema(
                'Revoke this API key?',
                'Confirm that you want to permanently revoke this API key.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'revoke_api_key',
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
                    text: 'API key revocation confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'API key revocation was cancelled by the user.',
                },
              ],
            };
          }

          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'API key revocation was not confirmed.',
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const result = await client.deleteApiKey(validatedArgs.api_key_id);

        return {
          content: [
            {
              type: 'text',
              text: `${result.success ? 'API key revoked.' : 'API key revocation failed.'} ${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error revoking API key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
