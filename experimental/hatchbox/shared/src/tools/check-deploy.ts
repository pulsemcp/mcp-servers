import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const CheckDeploySchema = z.object({
  activityId: z.string().describe('The deployment activity ID to check'),
});

export function checkDeployTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'checkDeploy',
    description: 'Check the status of a deployment activity',
    inputSchema: {
      type: 'object',
      properties: {
        activityId: {
          type: 'string',
          description: 'The deployment activity ID to check',
        },
      },
      required: ['activityId'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = CheckDeploySchema.parse(args);
      const client = clientFactory();

      try {
        const deployment = await client.checkDeploy(validatedArgs.activityId);

        let statusEmoji = '⏳';
        if (deployment.status === 'completed' || deployment.status === 'success') {
          statusEmoji = '✅';
        } else if (deployment.status === 'failed' || deployment.status === 'error') {
          statusEmoji = '❌';
        }

        let response = `${statusEmoji} Deployment Status: ${deployment.status}\n\nActivity ID: ${deployment.id}`;

        if (deployment.output) {
          response += `\n\nOutput:\n${deployment.output}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
