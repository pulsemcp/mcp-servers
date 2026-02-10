import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  projectId:
    'Filter by project ID or name (e.g., "prj_abc123" or "my-app"). ' +
    'When set, only deployments for this project are returned.',
  app: 'Filter by deployment name (the project name used in the URL). Example: "my-app"',
  limit:
    'Maximum number of deployments to return (1-100). Default: 20. ' +
    'Use with pagination to page through results.',
  target:
    'Filter by deployment target environment. Options: "production", "preview". ' +
    'Omit to return deployments for all targets.',
  state:
    'Filter by deployment state. Options: "BUILDING", "ERROR", "INITIALIZING", "QUEUED", "READY", "CANCELED". ' +
    'Omit to return deployments in any state.',
  until:
    'Return deployments created before this timestamp (milliseconds since epoch). ' +
    'Used for pagination: pass the "next" value from a previous response.',
} as const;

const ListDeploymentsSchema = z.object({
  projectId: z.string().optional().describe(PARAM_DESCRIPTIONS.projectId),
  app: z.string().optional().describe(PARAM_DESCRIPTIONS.app),
  limit: z.number().min(1).max(100).optional().default(20).describe(PARAM_DESCRIPTIONS.limit),
  target: z.enum(['production', 'preview']).optional().describe(PARAM_DESCRIPTIONS.target),
  state: z
    .enum(['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.state),
  until: z.number().optional().describe(PARAM_DESCRIPTIONS.until),
});

const TOOL_DESCRIPTION = `List Vercel deployments with optional filtering by project, target environment, and state.

Returns deployment ID, name, URL, state, creator, and creation time for each deployment. Supports pagination via the "until" parameter.

**Example response:**
\`\`\`json
{
  "deployments": [
    {
      "uid": "dpl_abc123",
      "name": "my-app",
      "url": "my-app-abc123.vercel.app",
      "state": "READY",
      "target": "production",
      "created": 1700000000000
    }
  ],
  "pagination": { "count": 20, "next": 1699999000000 }
}
\`\`\`

**Use cases:**
- List all recent deployments for a project
- Find failed deployments that need attention
- Check deployment history for a specific environment (production/preview)
- Page through deployment history using the pagination cursor`;

export function listDeploymentsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_deployments',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: PARAM_DESCRIPTIONS.projectId },
        app: { type: 'string', description: PARAM_DESCRIPTIONS.app },
        limit: { type: 'number', default: 20, description: PARAM_DESCRIPTIONS.limit },
        target: {
          type: 'string',
          enum: ['production', 'preview'],
          description: PARAM_DESCRIPTIONS.target,
        },
        state: {
          type: 'string',
          enum: ['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'],
          description: PARAM_DESCRIPTIONS.state,
        },
        until: { type: 'number', description: PARAM_DESCRIPTIONS.until },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListDeploymentsSchema.parse(args);
        const client = clientFactory();
        const result = await client.listDeployments(validatedArgs);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing deployments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
