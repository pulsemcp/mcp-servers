import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to wait for.',
  state:
    'The target state to wait for (created, starting, started, stopping, stopped, suspended, destroyed).',
  timeout: 'Optional timeout in seconds (default: 60).',
} as const;

export const WaitMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
  state: z
    .enum(['created', 'starting', 'started', 'stopping', 'stopped', 'suspended', 'destroyed'])
    .describe(PARAM_DESCRIPTIONS.state),
  timeout: z.number().int().positive().optional().describe(PARAM_DESCRIPTIONS.timeout),
});

const TOOL_DESCRIPTION = `Wait for a machine to reach a specific state.

Blocks until the machine transitions to the specified state or times out. Useful for synchronizing operations that depend on machine state changes.

**Returns:**
- Confirmation when the machine reaches the target state

**Use cases:**
- Wait for a machine to finish starting before sending traffic
- Ensure a machine is fully stopped before deletion
- Coordinate multi-step deployment operations`;

export function waitMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'wait_machine',
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
        state: {
          type: 'string',
          enum: ['created', 'starting', 'started', 'stopping', 'stopped', 'suspended', 'destroyed'],
          description: PARAM_DESCRIPTIONS.state,
        },
        timeout: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.timeout,
        },
      },
      required: ['app_name', 'machine_id', 'state'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = WaitMachineSchema.parse(args);
        const client = clientFactory();

        await client.waitMachine(
          validatedArgs.app_name,
          validatedArgs.machine_id,
          validatedArgs.state,
          validatedArgs.timeout
        );

        return {
          content: [
            {
              type: 'text',
              text: `Machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}" reached state "${validatedArgs.state}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error waiting for machine state: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
