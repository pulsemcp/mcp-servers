import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import type { ClientFactory } from '../server.js';
import { readCmsAdminElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the API key to revoke.',
} as const;

const DeleteApiKeySchema = z.object({
  id: z.number().int().positive().describe(PARAM_DESCRIPTIONS.id),
});

const TOOL_DESCRIPTION = `Permanently revoke (delete) an API key.

**This is a destructive operation.** Revoking an API key immediately invalidates it; any clients still using the key will start receiving 401 Unauthorized. The deletion is idempotent — calling delete on a non-existent or already-deleted key returns success.

By default, the request requires explicit user approval via MCP elicitation before being sent to the admin API.

**Parameters:**
- \`id\` (required): Numeric ID of the API key.

**Returns:**
- \`success\`: Boolean indicating whether the request succeeded.
- \`message\`: Human-readable confirmation message.

**Use cases:**
- Revoke a leaked or compromised API key.
- Roll a tenant's keys after a permission change.
- Remove a deprecated key during cleanup.`;

export function deleteApiKey(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_api_key',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteApiKeySchema.parse(args);

        const elicitConfig = readCmsAdminElicitationConfig();
        if (elicitConfig.destructiveElicitationEnabled) {
          const lines: string[] = [
            'About to PERMANENTLY REVOKE an API key via the PulseMCP admin API:',
            `  API key ID: ${validatedArgs.id}`,
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
                'com.pulsemcp/tool-name': 'delete_api_key',
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
        const result = await client.deleteApiKey(validatedArgs.id);

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
