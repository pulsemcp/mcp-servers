import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  projectId: 'The project ID (e.g., "prj_abc123"). Use list_projects to find project IDs.',
  deploymentId:
    'The deployment ID to get runtime logs for (e.g., "dpl_abc123"). ' +
    'Must be a READY deployment with recent traffic.',
} as const;

const GetRuntimeLogsSchema = z.object({
  projectId: z.string().min(1).describe(PARAM_DESCRIPTIONS.projectId),
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
});

const TOOL_DESCRIPTION = `Get runtime (application) logs for a Vercel deployment.

Returns recent runtime log entries including serverless function invocations, edge function logs, and request/response information.

**Important:** Runtime logs are stored for a maximum of 1 hour. Older logs are not available through this endpoint.

**Example response:**
\`\`\`json
[
  {
    "message": "GET /api/health 200 in 12ms",
    "timestampInMs": 1700000000000,
    "source": "serverless",
    "level": "info",
    "requestMethod": "GET",
    "requestPath": "/api/health",
    "responseStatusCode": 200
  }
]
\`\`\`

**Log sources:** serverless, edge-function, edge-middleware, request

**Use cases:**
- Debug runtime errors in serverless or edge functions
- Monitor API endpoint response times and status codes
- View application-level log output from deployed functions
- Investigate 500 errors or unexpected behavior in production`;

export function getRuntimeLogsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_runtime_logs',
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
        const validatedArgs = GetRuntimeLogsSchema.parse(args);
        const client = clientFactory();
        const result = await client.getRuntimeLogs(
          validatedArgs.projectId,
          validatedArgs.deploymentId
        );

        if (result.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No runtime logs found. Note: Vercel stores runtime logs for a maximum of 1 hour. The deployment may not have received any recent traffic.',
              },
            ],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting runtime logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
