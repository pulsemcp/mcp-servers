import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  limit: 'Maximum number of projects to return (1-100). Default: 20.',
  search: 'Search projects by name. Example: "my-app"',
  until:
    'Return projects created before this timestamp (milliseconds since epoch). Used for pagination.',
} as const;

const ListProjectsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20).describe(PARAM_DESCRIPTIONS.limit),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  until: z.number().optional().describe(PARAM_DESCRIPTIONS.until),
});

const TOOL_DESCRIPTION = `List Vercel projects in the account or team.

Returns project IDs, names, and framework information. Useful for looking up project IDs needed by other tools like promote_deployment, rollback_deployment, and get_runtime_logs.

**Example response:**
\`\`\`json
{
  "projects": [
    { "id": "prj_abc123", "name": "my-app", "framework": "nextjs" },
    { "id": "prj_def456", "name": "my-api", "framework": "other" }
  ],
  "pagination": { "count": 2, "next": null }
}
\`\`\`

**Use cases:**
- Look up the project ID for use with promote, rollback, or log tools
- Browse all projects in the account or team
- Search for a specific project by name`;

export function listProjectsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_projects',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', default: 20, description: PARAM_DESCRIPTIONS.limit },
        search: { type: 'string', description: PARAM_DESCRIPTIONS.search },
        until: { type: 'number', description: PARAM_DESCRIPTIONS.until },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListProjectsSchema.parse(args);
        const client = clientFactory();
        const result = await client.listProjects(validatedArgs);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
