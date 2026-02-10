import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  idOrUrl:
    'The deployment ID (e.g., "dpl_abc123") or deployment URL (e.g., "my-app-abc123.vercel.app"). ' +
    'Use the deployment ID from list_deployments or the URL shown in the Vercel dashboard.',
} as const;

const GetDeploymentSchema = z.object({
  idOrUrl: z.string().min(1).describe(PARAM_DESCRIPTIONS.idOrUrl),
});

const TOOL_DESCRIPTION = `Get detailed information about a specific Vercel deployment.

Returns comprehensive deployment data including state, aliases, regions, git source info, and inspector URL.

**Example response:**
\`\`\`json
{
  "uid": "dpl_abc123",
  "name": "my-app",
  "url": "my-app-abc123.vercel.app",
  "state": "READY",
  "readyState": "READY",
  "target": "production",
  "alias": ["my-app.vercel.app", "my-app-production.vercel.app"],
  "regions": ["iad1", "sfo1"],
  "inspectorUrl": "https://vercel.com/team/my-app/dpl_abc123",
  "created": 1700000000000
}
\`\`\`

**Use cases:**
- Check the current state of a specific deployment
- Get the production URL and aliases for a deployment
- View which regions a deployment is running in
- Access the inspector URL for debugging in the Vercel dashboard
- Verify git source information (branch, commit SHA)`;

export function getDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_deployment',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        idOrUrl: { type: 'string', description: PARAM_DESCRIPTIONS.idOrUrl },
      },
      required: ['idOrUrl'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetDeploymentSchema.parse(args);
        const client = clientFactory();
        const result = await client.getDeployment(validatedArgs.idOrUrl);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
