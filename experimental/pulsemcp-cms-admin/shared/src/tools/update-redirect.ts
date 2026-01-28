import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { RedirectStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the redirect to update',
  from: 'Updated source path to redirect from',
  to: 'Updated destination path or URL to redirect to',
  status: 'Updated status (draft, active, paused, archived)',
} as const;

const UpdateRedirectSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  from: z.string().optional().describe(PARAM_DESCRIPTIONS.from),
  to: z.string().optional().describe(PARAM_DESCRIPTIONS.to),
  status: z
    .enum(['draft', 'active', 'paused', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
});

export function updateRedirect(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_redirect',
    description: `Update an existing URL redirect by its ID. Only provided fields will be updated.

Example request:
{
  "id": 123,
  "status": "active"
}

Use cases:
- Activate a draft redirect
- Change the destination URL of an existing redirect
- Pause or archive a redirect
- Update the source path of a redirect`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        from: { type: 'string', description: PARAM_DESCRIPTIONS.from },
        to: { type: 'string', description: PARAM_DESCRIPTIONS.to },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'paused', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateRedirectSchema.parse(args);
      const client = clientFactory();

      try {
        const { id, ...rest } = validatedArgs;

        const params: { from?: string; to?: string; status?: RedirectStatus } = {};
        if (rest.from !== undefined) params.from = rest.from;
        if (rest.to !== undefined) params.to = rest.to;
        if (rest.status !== undefined) params.status = rest.status as RedirectStatus;

        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        const redirect = await client.updateRedirect(id, params);

        let content = `Successfully updated redirect!\n\n`;
        content += `**ID:** ${redirect.id}\n`;
        content += `**From:** ${redirect.from}\n`;
        content += `**To:** ${redirect.to}\n`;
        content += `**Status:** ${redirect.status}\n`;
        if (redirect.updated_at) {
          content += `**Updated:** ${redirect.updated_at}\n`;
        }

        content += `\n**Fields updated:**\n`;
        Object.keys(params).forEach((field) => {
          content += `- ${field}\n`;
        });

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating redirect: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
