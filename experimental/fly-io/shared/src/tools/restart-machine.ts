import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to restart.',
} as const;

export const RestartMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Restart a running machine.

Stops the machine and then starts it again. This is useful for applying configuration changes or recovering from a stuck state.

**Returns:**
- Confirmation that the machine was restarted

**Use cases:**
- Apply configuration changes that require a restart
- Recover from a stuck or unresponsive machine
- Clear memory and reset state`;

export function restartMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'restart_machine',
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
        const validatedArgs = RestartMachineSchema.parse(args);
        const client = clientFactory();

        await client.restartMachine(validatedArgs.app_name, validatedArgs.machine_id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully restarted machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error restarting machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
