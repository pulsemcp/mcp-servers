import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  projectId: 'The project ID (e.g., "prj_abc123"). Use list_projects to find project IDs.',
  deploymentId:
    'The deployment ID to promote to production (e.g., "dpl_abc123"). ' +
    'The deployment must be in READY state. This does NOT rebuild the deployment.',
} as const;

const PromoteDeploymentSchema = z.object({
  projectId: z.string().min(1).describe(PARAM_DESCRIPTIONS.projectId),
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
});

const TOOL_DESCRIPTION = `Promote a Vercel deployment to production.

Promotes an existing READY deployment to production without rebuilding it. The promoted deployment will serve traffic on the production domain.

**Note:** This does NOT rebuild the deployment. To deploy new code, use create_deployment instead.

**Use cases:**
- Promote a preview deployment that has been verified to production
- Move a staging deployment to production after testing
- Quickly switch production to a known-good deployment`;

export function promoteDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'promote_deployment',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: PARAM_DESCRIPTIONS.projectId },
        deploymentId: { type: 'string', description: PARAM_DESCRIPTIONS.deploymentId },
      },
      required: ['projectId', 'deploymentId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = PromoteDeploymentSchema.parse(args);
        const client = clientFactory();
        await client.promoteDeployment(validatedArgs.projectId, validatedArgs.deploymentId);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully promoted deployment ${validatedArgs.deploymentId} to production for project ${validatedArgs.projectId}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error promoting deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
