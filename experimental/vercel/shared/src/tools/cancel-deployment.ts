import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  deploymentId:
    'The ID of the deployment to cancel (e.g., "dpl_abc123"). ' +
    'Only deployments in BUILDING or QUEUED state can be canceled.',
} as const;

const CancelDeploymentSchema = z.object({
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
});

const TOOL_DESCRIPTION = `Cancel an in-progress Vercel deployment.

Only deployments in BUILDING or QUEUED state can be canceled. Returns the deployment with updated CANCELED state.

**Example response:**
\`\`\`json
{
  "uid": "dpl_abc123",
  "name": "my-app",
  "state": "CANCELED",
  "readyState": "CANCELED"
}
\`\`\`

**Use cases:**
- Stop a deployment that was triggered by mistake
- Cancel a build that is taking too long
- Abort a deployment to a wrong environment`;

export function cancelDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'cancel_deployment',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        deploymentId: { type: 'string', description: PARAM_DESCRIPTIONS.deploymentId },
      },
      required: ['deploymentId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CancelDeploymentSchema.parse(args);
        const client = clientFactory();
        const result = await client.cancelDeployment(validatedArgs.deploymentId);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error canceling deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
