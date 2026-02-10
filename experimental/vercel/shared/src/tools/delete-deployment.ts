import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  deploymentId:
    'The ID of the deployment to delete (e.g., "dpl_abc123"). ' + 'This action is irreversible.',
} as const;

const DeleteDeploymentSchema = z.object({
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
});

const TOOL_DESCRIPTION = `Delete a Vercel deployment permanently.

This action is irreversible. The deployment URL will no longer be accessible after deletion.

**Example response:**
\`\`\`json
{
  "uid": "dpl_abc123",
  "state": "DELETED"
}
\`\`\`

**Use cases:**
- Remove old or unused deployments
- Clean up failed or test deployments
- Delete sensitive deployments that should no longer be accessible`;

export function deleteDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_deployment',
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
        const validatedArgs = DeleteDeploymentSchema.parse(args);
        const client = clientFactory();
        const result = await client.deleteDeployment(validatedArgs.deploymentId);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
