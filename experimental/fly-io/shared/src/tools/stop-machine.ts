import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to stop.',
} as const;

export const StopMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Stop a running machine.

Gracefully shuts down a running machine. The machine can be started again later.

**Returns:**
- Confirmation that the stop command was issued

**Use cases:**
- Temporarily stop a machine to save costs
- Prepare a machine for maintenance
- Stop a machine before deletion`;

export function stopMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'stop_machine',
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
      },
      required: ['app_name', 'machine_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = StopMachineSchema.parse(args);
        const client = clientFactory();

        await client.stopMachine(validatedArgs.app_name, validatedArgs.machine_id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully stopped machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error stopping machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
