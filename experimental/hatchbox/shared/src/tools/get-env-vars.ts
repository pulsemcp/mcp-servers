import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

// No parameters needed - uses environment variables
const GetEnvVarsSchema = z.object({});

export function getEnvVarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVars',
    description: 'Retrieve all environment variables for the configured Hatchbox application',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      GetEnvVarsSchema.parse(args);
      const client = clientFactory();

      try {
        const envVars = await client.getEnvVars();

        // Format the response
        const formattedVars = envVars.map((env) => `${env.name}=${env.value}`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text:
                envVars.length > 0
                  ? `Environment variables:\n\n${formattedVars}`
                  : 'No environment variables found',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
