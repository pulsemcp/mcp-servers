import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

// No parameters needed - uses environment variables
const GetEnvVarsSchema = z.object({});

export function getEnvVarsTool(_server: Server, _clientFactory: ClientFactory) {
  return {
    name: 'getEnvVars',
    description:
      'NOTE: This operation is not supported by the Hatchbox API. The API only allows setting and deleting environment variables, not retrieving them.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      GetEnvVarsSchema.parse(args);

      return {
        content: [
          {
            type: 'text',
            text:
              'Retrieving environment variables is not supported by the Hatchbox API.\n\n' +
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
