import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const GetEnvVarSchema = z.object({
  name: z.string().describe('The environment variable name to retrieve'),
});

export function getEnvVarTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVar',
    description: 'Get the value of a specific environment variable',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The environment variable name to retrieve',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetEnvVarSchema.parse(args);
      const client = clientFactory();

      try {
        const envVars = await client.getEnvVars();
        const envVar = envVars.find((env) => env.name === validatedArgs.name);

        if (!envVar) {
          return {
            content: [
              {
                type: 'text',
                text: `Environment variable '${validatedArgs.name}' not found`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `${envVar.name}=${envVar.value}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving environment variable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
