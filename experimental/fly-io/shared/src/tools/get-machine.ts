import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to retrieve details for.',
} as const;

export const GetMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Get details for a specific machine in a Fly.io application.

Returns detailed information about a machine including its configuration.

**Returns:**
- Machine ID and name
- Current state
- Region and private IP
- Full configuration (image, env vars, resources)
- Created and updated timestamps

**Use cases:**
- Check detailed machine configuration
- Debug machine issues
- Verify machine settings before updates`;

export function getMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'get_machine',
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
        const validatedArgs = GetMachineSchema.parse(args);
        const client = clientFactory();

        const machine = await client.getMachine(validatedArgs.app_name, validatedArgs.machine_id);

        const output = [
          `Machine: ${machine.name || machine.id}`,
          `ID: ${machine.id}`,
          `State: ${machine.state}`,
          `Region: ${machine.region}`,
          `Private IP: ${machine.private_ip}`,
          `Image: ${machine.config?.image || 'unknown'}`,
          machine.config?.guest
            ? `Resources: ${machine.config.guest.cpus || 1} CPU, ${machine.config.guest.memory_mb || 256}MB RAM`
            : null,
          machine.config?.env
            ? `Environment Variables: ${Object.keys(machine.config.env).length} configured`
            : null,
          `Created: ${machine.created_at}`,
          `Updated: ${machine.updated_at}`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
