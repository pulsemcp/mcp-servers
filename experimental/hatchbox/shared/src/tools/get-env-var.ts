import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const GetEnvVarSchema = z.object({
  name: z.string().describe('The name of the environment variable to retrieve'),
});

export function getEnvVarTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVar',
    description: 'Get a specific environment variable from the Hatchbox server via SSH',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the environment variable to retrieve',
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetEnvVarSchema.parse(args);
      const client = clientFactory();

      if (!client.getEnvVar) {
        return {
          content: [
            {
              type: 'text',
              text: 'Reading environment variables requires WEB_SERVER_IP_ADDRESS to be configured',
            },
          ],
          isError: true,
        };
      }

      try {
        const envVar = await client.getEnvVar(validatedArgs.name);

        if (envVar) {
          return {
            content: [
              {
                type: 'text',
                text: `${envVar.name}=${envVar.value}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Environment variable '${validatedArgs.name}' not found`,
              },
            ],
          };
        }
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
