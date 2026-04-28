import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import type { ClientFactory } from '../server.js';
import { readCmsAdminElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  id_or_slug: 'The ID (number) or slug (string) of the tenant to delete.',
  force:
    'When true, deletes the tenant and cascades to dependent records (API keys, enrichments, etc.). When false (default), the deletion will fail with a 422 if dependents exist.',
} as const;

const DeleteTenantSchema = z.object({
  id_or_slug: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.id_or_slug),
  force: z.boolean().optional().describe(PARAM_DESCRIPTIONS.force),
});

const TOOL_DESCRIPTION = `Permanently delete a tenant from the PulseMCP admin API.

**This is a destructive operation.** Deleting a tenant removes the tenant record and (with \`force: true\`) cascades to dependent records such as API keys and enrichments. By default, the request requires explicit user approval via MCP elicitation before being sent to the admin API.

**Parameters:**
- \`id_or_slug\` (required): Numeric ID or slug of the tenant.
- \`force\` (optional, default false): Cascade-delete dependents. Without this, deleting a tenant that owns API keys or other resources returns 422.

**Returns:**
- \`success\`: Boolean indicating whether the tenant was deleted.
- \`message\`: Human-readable confirmation message.

**Use cases:**
- Permanently remove a deprovisioned tenant.
- Delete a test tenant created during onboarding/QA.
- Cascading cleanup of a tenant and all of its API keys (\`force: true\`).`;

export function deleteTenant(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_tenant',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        id_or_slug: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.id_or_slug,
        },
        force: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.force,
        },
      },
      required: ['id_or_slug'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteTenantSchema.parse(args);

        const elicitConfig = readCmsAdminElicitationConfig();
        if (elicitConfig.destructiveElicitationEnabled) {
          const lines: string[] = [
            'About to PERMANENTLY DELETE a tenant via the PulseMCP admin API:',
            `  Tenant: ${validatedArgs.id_or_slug}`,
            `  Cascade dependents (force): ${validatedArgs.force ? 'yes' : 'no'}`,
            '',
            'This action cannot be undone.',
          ];

          const confirmation = await requestConfirmation(
            {
              server,
              message: lines.join('\n') + '\n',
              requestedSchema: createConfirmationSchema(
                'Delete this tenant?',
                'Confirm that you want to permanently delete this tenant.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'delete_tenant',
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
                    text: 'Tenant deletion confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'Tenant deletion was cancelled by the user.',
                },
              ],
            };
          }

          // Defense-in-depth: some MCP clients may return action='accept' without the
          // user actually checking the confirmation checkbox.
          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Tenant deletion was not confirmed.',
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const result = await client.deleteTenant({
          id_or_slug: validatedArgs.id_or_slug,
          force: validatedArgs.force,
        });

        return {
          content: [
            {
              type: 'text',
              text: `${result.success ? 'Tenant deleted.' : 'Tenant deletion failed.'} ${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting tenant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
