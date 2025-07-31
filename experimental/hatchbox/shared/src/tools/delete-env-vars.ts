import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const DeleteEnvVarsSchema = z.object({
  names: z.array(z.string()).describe('Array of environment variable names to delete'),
});

export function deleteEnvVarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'deleteEnvVars',
    description: 'Delete one or more environment variables from the Hatchbox application',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of environment variable names to delete',
        },
      },
      required: ['names'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteEnvVarsSchema.parse(args);
      const client = clientFactory();

      try {
        const remainingVars = await client.deleteEnvVars(validatedArgs.names);

        const deletedNames = validatedArgs.names.join(', ');
        const remainingCount = remainingVars.length;

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted environment variables: ${deletedNames}\n${remainingCount} environment variable${remainingCount !== 1 ? 's' : ''} remaining.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
