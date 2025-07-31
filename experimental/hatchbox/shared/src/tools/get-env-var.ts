import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const GetEnvVarSchema = z.object({
  name: z.string().describe('The environment variable name to retrieve'),
});

export function getEnvVarTool(_server: Server, _clientFactory: ClientFactory) {
  return {
    name: 'getEnvVar',
    description:
      'NOTE: This operation is not supported by the Hatchbox API. The API only allows setting and deleting environment variables, not retrieving them.',
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

      return {
        content: [
          {
            type: 'text',
            text:
              `Retrieving the value of '${validatedArgs.name}' is not supported by the Hatchbox API.\n\n` +
              'The Hatchbox API only allows:\n' +
              '- Setting environment variables (use setEnvVar)\n' +
              '- Deleting environment variables (use deleteEnvVars)\n\n' +
              'To view your environment variables, please use the Hatchbox web dashboard.',
          },
        ],
        isError: true,
      };
    },
  };
}
