import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app to list machines for.',
} as const;

export const ListMachinesSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
});

const TOOL_DESCRIPTION = `List all machines in a Fly.io application.

Returns all machines (VMs) running in the specified app.

**Returns:**
- Machine ID and name
- Current state (started, stopped, etc.)
- Region
- Image being used
- Private IP address

**Use cases:**
- See all running instances of an app
- Check machine states
- Get machine IDs for other operations`;

export function listMachinesTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'list_machines',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListMachinesSchema.parse(args);
        const client = clientFactory();

        const machines = await client.listMachines(validatedArgs.app_name);

        if (machines.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No machines found in app "${validatedArgs.app_name}".`,
              },
            ],
          };
        }

        const output = machines
          .map(
            (m) =>
              `- ${m.name || m.id}\n  ID: ${m.id}\n  State: ${m.state}\n  Region: ${m.region}\n  Image: ${m.config?.image || 'unknown'}\n  IP: ${m.private_ip}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${machines.length} machine(s) in "${validatedArgs.app_name}":\n\n${output}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing machines: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
