import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const SetEnvVarSchema = z.object({
  name: z.string().describe('The environment variable name'),
  value: z.string().describe('The environment variable value'),
});

export function setEnvVarTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'setEnvVar',
    description: 'Set or update an environment variable for the Hatchbox application',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The environment variable name',
        },
        value: {
          type: 'string',
          description: 'The environment variable value',
        },
      },
      required: ['name', 'value'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetEnvVarSchema.parse(args);
      const client = clientFactory();

      try {
        await client.setEnvVar(validatedArgs.name, validatedArgs.value);

        // Find if this was an update or create
        const previousVars = await client.getEnvVars().catch(() => []);
        const wasUpdate = previousVars.some((env) => env.name === validatedArgs.name);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully ${wasUpdate ? 'updated' : 'created'} environment variable: ${validatedArgs.name}=${validatedArgs.value}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting environment variable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
