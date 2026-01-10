import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to delete.',
  force: 'Force deletion even if the machine is running. Default is false.',
} as const;

export const DeleteMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
  force: z.boolean().optional().default(false).describe(PARAM_DESCRIPTIONS.force),
});

const TOOL_DESCRIPTION = `Delete a machine from a Fly.io application.

Permanently removes a machine and all its data.

**Warning:** This action is irreversible. All data on the machine will be lost.

**Returns:**
- Confirmation of deletion

**Use cases:**
- Remove unused machines
- Scale down by removing instances
- Clean up failed deployments

**Note:** Use force=true to delete running machines. Otherwise, stop the machine first.`;

export function deleteMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'delete_machine',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        machine_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.machine_id,
        },
        force: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.force,
        },
      },
      required: ['app_name', 'machine_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteMachineSchema.parse(args);
        const client = clientFactory();

        await client.deleteMachine(
          validatedArgs.app_name,
          validatedArgs.machine_id,
          validatedArgs.force
        );

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted machine "${validatedArgs.machine_id}" from app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
