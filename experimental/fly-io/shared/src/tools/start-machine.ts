import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to start.',
} as const;

export const StartMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Start a stopped machine.

Boots up a machine that was previously stopped.

**Returns:**
- Confirmation that the start command was issued

**Use cases:**
- Resume a stopped machine
- Start machines that were created with skip_launch=true
- Restart machines after maintenance`;

export function startMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'start_machine',
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
        const validatedArgs = StartMachineSchema.parse(args);
        const client = clientFactory();

        await client.startMachine(validatedArgs.app_name, validatedArgs.machine_id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully started machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error starting machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
