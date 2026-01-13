import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app to create the machine in.',
  name: 'Optional name for the machine. If not provided, one will be auto-generated.',
  region:
    'The region to deploy the machine in (e.g., "iad", "lax", "lhr"). Defaults to the nearest region.',
  image:
    'The Docker image to run (e.g., "nginx:latest", "registry.fly.io/myapp:latest"). Required.',
  cpus: 'Number of CPUs to allocate. Default is 1.',
  memory_mb: 'Memory in MB to allocate. Default is 256.',
  cpu_kind: 'CPU type: "shared" (default) or "performance" for dedicated CPUs.',
  env: 'Environment variables as a JSON object (e.g., {"KEY": "value"}).',
  auto_destroy: 'Whether to automatically destroy the machine when it exits. Default is false.',
  skip_launch:
    'Create the machine in stopped state. Default is false (machine starts immediately).',
} as const;

export const CreateMachineSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  region: z.string().optional().describe(PARAM_DESCRIPTIONS.region),
  image: z.string().min(1).describe(PARAM_DESCRIPTIONS.image),
  cpus: z.number().optional().describe(PARAM_DESCRIPTIONS.cpus),
  memory_mb: z.number().optional().describe(PARAM_DESCRIPTIONS.memory_mb),
  cpu_kind: z.enum(['shared', 'performance']).optional().describe(PARAM_DESCRIPTIONS.cpu_kind),
  env: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.env),
  auto_destroy: z.boolean().optional().describe(PARAM_DESCRIPTIONS.auto_destroy),
  skip_launch: z.boolean().optional().describe(PARAM_DESCRIPTIONS.skip_launch),
});

const TOOL_DESCRIPTION = `Create a new machine (VM) in a Fly.io application.

Deploys a Docker image as a new machine with specified configuration.

**Returns:**
- Created machine ID and name
- State (started or stopped)
- Region and IP
- Applied configuration

**Use cases:**
- Deploy new instances of an application
- Scale out by adding more machines
- Create machines with specific resource configurations

**Examples:**
- Basic: image="nginx:latest"
- With resources: image="myapp:v1", cpus=2, memory_mb=512
- With env vars: image="myapp:v1", env={"DATABASE_URL": "..."}`;

export function createMachineTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'create_machine',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.name,
        },
        region: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.region,
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
      required: ['app_name', 'image'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateMachineSchema.parse(args);
        const client = clientFactory();

        const machine = await client.createMachine(validatedArgs.app_name, {
          name: validatedArgs.name,
          region: validatedArgs.region,
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
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created machine "${machine.name || machine.id}":\n- ID: ${machine.id}\n- State: ${machine.state}\n- Region: ${machine.region}\n- IP: ${machine.private_ip}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating machine: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
