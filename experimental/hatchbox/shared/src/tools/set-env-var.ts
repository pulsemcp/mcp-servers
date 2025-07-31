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

        // Since we can't retrieve env vars to check if it was an update or create,
        // we'll just say "set" which covers both cases
        return {
          content: [
            {
              type: 'text',
              text: `Successfully set environment variable: ${validatedArgs.name}=${validatedArgs.value}`,
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
