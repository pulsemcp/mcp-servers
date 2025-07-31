import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ClientFactory } from '../server.js';

export function getEnvVarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVars',
    description: 'Get all environment variables from the Hatchbox server via SSH',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (_args: unknown) => {
      const client = clientFactory();

      if (!client.getEnvVars) {
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
        const envVars = await client.getEnvVars();

        // Format env vars for display
        const envVarsList = envVars.map((env) => `${env.name}=${env.value}`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Environment variables (${envVars.length} total):\n\n${envVarsList}`,
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
