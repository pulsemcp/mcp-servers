import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to execute the command on.',
  command: 'The command to execute on the machine.',
  timeout: 'Optional: Timeout in seconds (default: 30).',
} as const;

export const MachineExecSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
  command: z.string().min(1).describe(PARAM_DESCRIPTIONS.command),
  timeout: z.number().int().positive().optional().describe(PARAM_DESCRIPTIONS.timeout),
});

const TOOL_DESCRIPTION = `Execute a command on a machine.

Runs a command on a specific Fly.io machine and returns the output. This is equivalent to "fly machine exec".

**Returns:**
- The command output (stdout)

**Use cases:**
- Run diagnostic commands
- Check file contents
- Execute maintenance scripts
- Debug application issues
- Inspect running processes`;

export function machineExecTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'machine_exec',
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
        command: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.command,
        },
        timeout: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.timeout,
        },
      },
      required: ['app_name', 'machine_id', 'command'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = MachineExecSchema.parse(args);
        const client = clientFactory();

        const output = await client.execCommand(
          validatedArgs.app_name,
          validatedArgs.machine_id,
          validatedArgs.command,
          validatedArgs.timeout
        );

        return {
          content: [
            {
              type: 'text',
              text: output || '(command completed with no output)',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
