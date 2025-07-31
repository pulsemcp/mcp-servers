import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const TriggerDeploySchema = z.object({
  sha: z
    .string()
    .optional()
    .describe('Specific commit SHA to deploy (deploys latest if not provided)'),
});

export function triggerDeployTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'triggerDeploy',
    description: 'Trigger a new deployment for the Hatchbox application',
    inputSchema: {
      type: 'object',
      properties: {
        sha: {
          type: 'string',
          description: 'Specific commit SHA to deploy (deploys latest if not provided)',
        },
      },
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = TriggerDeploySchema.parse(args);
      const client = clientFactory();

      try {
        const deployment = await client.triggerDeploy(validatedArgs.sha);

        return {
          content: [
            {
              type: 'text',
              text: `Deployment triggered successfully!\n\nActivity ID: ${deployment.id}\nStatus: ${deployment.status}\n\nUse checkDeploy with activity ID "${deployment.id}" to monitor progress.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error triggering deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
