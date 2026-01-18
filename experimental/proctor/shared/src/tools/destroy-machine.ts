import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  machine_id:
    'ID of the Fly.io machine to destroy. Get this from get_machines. Must contain only alphanumeric characters, underscores, and hyphens.',
} as const;

const DestroyMachineSchema = z.object({
  machine_id: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Machine ID must contain only alphanumeric characters, underscores, and hyphens'
    )
    .describe(PARAM_DESCRIPTIONS.machine_id),
});

export function destroyMachine(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'destroy_machine',
    description: `Delete a Fly.io machine.

Permanently removes a Fly machine that was used for Proctor exam execution.
Use this to clean up machines that are no longer needed.

**Returns:**
- success: boolean indicating if the machine was deleted

**Use cases:**
- Clean up machines after exam completion
- Remove stuck or failed machines
- Free up resources
- Remove machines that are no longer needed

**Warning:**
- This action is irreversible
- Any running processes on the machine will be terminated
- Use cancel_exam first if there's a running exam you want to stop gracefully`,
    inputSchema: {
      type: 'object',
      properties: {
        machine_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.machine_id,
        },
      },
      required: ['machine_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DestroyMachineSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.destroyMachine(validatedArgs.machine_id);

        let content = '## Machine Destroyed\n\n';
        content += `**Machine ID:** ${validatedArgs.machine_id}\n`;
        content += `**Success:** ${response.success}\n\n`;
        content += 'The machine has been permanently deleted.';

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error destroying machine: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
