import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  projectId: 'The project ID (e.g., "prj_abc123"). Use list_projects to find project IDs.',
  deploymentId:
    'The deployment ID to rollback TO (e.g., "dpl_abc123"). ' +
    'This deployment will become the active production deployment.',
  description:
    'Optional reason for the rollback. Useful for audit trails. Example: "Rolling back due to regression in v2.1"',
} as const;

const RollbackDeploymentSchema = z.object({
  projectId: z.string().min(1).describe(PARAM_DESCRIPTIONS.projectId),
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

const TOOL_DESCRIPTION = `Rollback to a previous Vercel deployment.

Rolls back the project's production deployment to the specified deployment. The target deployment will become active and serve production traffic.

**Use cases:**
- Quickly revert production to a known-good deployment after a regression
- Undo a broken production deployment
- Restore a previous version while investigating an issue`;

export function rollbackDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'rollback_deployment',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: PARAM_DESCRIPTIONS.projectId },
        deploymentId: { type: 'string', description: PARAM_DESCRIPTIONS.deploymentId },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: ['projectId', 'deploymentId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = RollbackDeploymentSchema.parse(args);
        const client = clientFactory();
        await client.rollbackDeployment(
          validatedArgs.projectId,
          validatedArgs.deploymentId,
          validatedArgs.description
        );

        return {
          content: [
            {
              type: 'text',
              text: `Successfully rolled back project ${validatedArgs.projectId} to deployment ${validatedArgs.deploymentId}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error rolling back deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
