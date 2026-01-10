import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to update.',
  image: 'The new Docker image to run. Required for updates.',
  cpus: 'Number of CPUs to allocate.',
  memory_mb: 'Memory in MB to allocate.',
  cpu_kind: 'CPU type: "shared" or "performance" for dedicated CPUs.',
  env: 'Environment variables as a JSON object. This replaces all existing env vars.',
  auto_destroy: 'Whether to automatically destroy the machine when it exits.',
  skip_launch:
    'Update the machine but keep it stopped. Default is false (machine restarts with new config).',
} as const;

export const UpdateMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
  image: z.string().min(1).describe(PARAM_DESCRIPTIONS.image),
  cpus: z.number().optional().describe(PARAM_DESCRIPTIONS.cpus),
  memory_mb: z.number().optional().describe(PARAM_DESCRIPTIONS.memory_mb),
  cpu_kind: z.enum(['shared', 'performance']).optional().describe(PARAM_DESCRIPTIONS.cpu_kind),
  env: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.env),
  auto_destroy: z.boolean().optional().describe(PARAM_DESCRIPTIONS.auto_destroy),
  skip_launch: z.boolean().optional().describe(PARAM_DESCRIPTIONS.skip_launch),
});

const TOOL_DESCRIPTION = `Update an existing machine's configuration.

Updates the machine with new configuration and optionally restarts it.

**Returns:**
- Updated machine details
- New state and configuration

**Use cases:**
- Deploy new version of an image
- Scale machine resources up or down
- Update environment variables
- Change machine configuration

**Note:** This replaces the entire configuration. Env vars are completely replaced, not merged.`;

export function updateMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'update_machine',
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
        image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.image,
        },
        cpus: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.cpus,
        },
        memory_mb: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.memory_mb,
        },
        cpu_kind: {
          type: 'string',
          enum: ['shared', 'performance'],
          description: PARAM_DESCRIPTIONS.cpu_kind,
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: PARAM_DESCRIPTIONS.env,
        },
        auto_destroy: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.auto_destroy,
        },
        skip_launch: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.skip_launch,
        },
      },
      required: ['app_name', 'machine_id', 'image'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UpdateMachineSchema.parse(args);
        const client = clientFactory();

        const machine = await client.updateMachine(
          validatedArgs.app_name,
          validatedArgs.machine_id,
          {
            skip_launch: validatedArgs.skip_launch,
            config: {
              image: validatedArgs.image,
              env: validatedArgs.env,
              auto_destroy: validatedArgs.auto_destroy,
              guest:
                validatedArgs.cpus || validatedArgs.memory_mb || validatedArgs.cpu_kind
                  ? {
                      cpus: validatedArgs.cpus,
                      memory_mb: validatedArgs.memory_mb,
                      cpu_kind: validatedArgs.cpu_kind,
                    }
                  : undefined,
            },
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated machine "${machine.name || machine.id}":\n- ID: ${machine.id}\n- State: ${machine.state}\n- Image: ${machine.config?.image}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
