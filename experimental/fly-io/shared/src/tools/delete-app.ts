import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app to delete.',
  force:
    'Force deletion even if the app has running machines. Default is false, which will fail if machines exist.',
} as const;

export const DeleteAppSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  force: z.boolean().optional().default(false).describe(PARAM_DESCRIPTIONS.force),
});

const TOOL_DESCRIPTION = `Delete a Fly.io application.

Permanently deletes an app and all associated resources.

**Warning:** This action is irreversible. All machines, volumes, and data will be lost.

**Returns:**
- Confirmation of deletion

**Use cases:**
- Clean up unused applications
- Remove test or development apps
- Free up app name for reuse

**Note:** Use force=true to delete apps with running machines.`;

export function deleteAppTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'delete_app',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        force: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.force,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteAppSchema.parse(args);
        const client = clientFactory();

        await client.deleteApp(validatedArgs.app_name, validatedArgs.force);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting app: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
