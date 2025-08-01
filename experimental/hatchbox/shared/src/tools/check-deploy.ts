import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  activityId:
    'The deployment activity ID returned by triggerDeploy (e.g., "12345", "67890"). Used to track deployment progress and retrieve logs',
} as const;

const CheckDeploySchema = z.object({
  activityId: z.string().describe(PARAM_DESCRIPTIONS.activityId),
});

export function checkDeployTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'checkDeploy',
    description: `Check the status and progress of a deployment activity on Hatchbox. This tool retrieves real-time information about a deployment including its current status, build logs, and any error messages. Essential for monitoring deployments and troubleshooting failures.

Example response:
✅ Deployment Status: completed

Activity ID: 12345

Output:
[2024-01-15 10:30:00] Pulling latest code from repository...
[2024-01-15 10:30:15] Installing dependencies...
[2024-01-15 10:31:00] Compiling assets...
[2024-01-15 10:32:00] Running database migrations...
[2024-01-15 10:32:30] Restarting application servers...
[2024-01-15 10:33:00] Deployment completed successfully!

Status meanings:
- pending: Deployment queued but not started
- running: Deployment in progress
- completed/success: Deployment finished successfully
- failed/error: Deployment encountered errors

Use cases:
- Monitoring deployment progress after triggering
- Troubleshooting failed deployments with error logs
- Verifying successful deployments before announcing changes
- Checking if migrations ran successfully
- Tracking deployment duration and performance
- Debugging asset compilation or dependency issues

Important notes:
- Activity IDs are returned by the triggerDeploy tool
- Status updates in real-time as deployment progresses
- Full deployment logs are included in the output
- Failed deployments include error details for debugging`,
    inputSchema: {
      type: 'object',
      properties: {
        activityId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.activityId,
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
