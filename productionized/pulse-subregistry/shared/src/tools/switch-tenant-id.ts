/**
 * Admin tool for switching the active tenant ID at runtime
 */

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../client.js';

const PARAM_DESCRIPTIONS = {
  tenant_id:
    'The tenant ID to switch to. All subsequent API requests will use this tenant ID. Pass an empty string to clear the tenant ID and revert to the default (no tenant).',
} as const;

const switchTenantIdArgsSchema = z.object({
  tenant_id: z.string().describe(PARAM_DESCRIPTIONS.tenant_id),
});

export function switchTenantIdTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'switch_tenant_id',
    description:
      'Switch the active tenant ID used for all subsequent API requests. This is an admin tool for multi-tenant scenarios. Pass an empty string to clear the tenant ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenant_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tenant_id,
        },
      },
      required: ['tenant_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = switchTenantIdArgsSchema.parse(args);
        const client = clientFactory();

        const newTenantId = validatedArgs.tenant_id || undefined;
        client.setTenantId(newTenantId);

        const message = newTenantId
          ? `Tenant ID switched to: ${newTenantId}`
          : 'Tenant ID cleared. Using default (no tenant).';

        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: 'text',
              text: `Error switching tenant ID: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
