import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to suspend.',
} as const;

export const SuspendMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Suspend a running machine.

Suspends the machine by saving its memory state to disk. The machine can be resumed later and will continue from where it left off. This is more cost-effective than keeping the machine running but faster to resume than a cold start.

**Returns:**
- Confirmation that the machine was suspended

**Use cases:**
- Save costs during periods of inactivity
- Preserve machine state for later resumption
- Faster wake-up compared to a stopped machine`;

export function suspendMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'suspend_machine',
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
        const validatedArgs = SuspendMachineSchema.parse(args);
        const client = clientFactory();

        await client.suspendMachine(validatedArgs.app_name, validatedArgs.machine_id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully suspended machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error suspending machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
