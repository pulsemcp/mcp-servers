import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  sha: 'Specific Git commit SHA to deploy (e.g., "ff28bd55fb6a", "abc123def456"). If not provided, deploys the latest commit from your configured branch',
} as const;

const TriggerDeploySchema = z.object({
  sha: z.string().optional().describe(PARAM_DESCRIPTIONS.sha),
});

export function triggerDeployTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'triggerDeploy',
    description: `Trigger a new deployment for your Rails application on Hatchbox. This tool initiates a deployment using Hatchbox's deployment webhook system, which will pull code from your Git repository, build assets, run migrations, and restart the application servers.

Example response:
Deployment triggered successfully!

Activity ID: 12345
Status: pending

Use checkDeploy with activity ID "12345" to monitor progress.

Use cases:
- Deploying after pushing new features to production
- Rolling back to a specific commit by providing its SHA
- Triggering deployments as part of CI/CD workflows
- Deploying hotfixes immediately
- Testing deployment process with specific commits
- Automating deployment schedules

Important notes:
- Requires HATCHBOX_DEPLOY_KEY to be configured
- Requires ALLOW_DEPLOYS=true (default)
- Without SHA parameter, deploys the latest commit from your configured branch
- Returns an activity ID for tracking deployment progress
- Deployments typically take 3-10 minutes depending on app size`,
    inputSchema: {
      type: 'object',
      properties: {
        sha: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.sha,
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
