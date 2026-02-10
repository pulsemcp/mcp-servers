import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  projectId: 'The project ID (e.g., "prj_abc123"). Use list_projects to find project IDs.',
  deploymentId:
    'The deployment ID to get runtime logs for (e.g., "dpl_abc123"). ' +
    'Must be a READY deployment with recent traffic.',
  since:
    'Return logs after this Unix timestamp in milliseconds (e.g., 1700000000000). ' +
    'Useful for querying historical logs within your plan retention window.',
  until:
    'Return logs before this Unix timestamp in milliseconds (e.g., 1700100000000). ' +
    'Use with "since" to define a time range.',
  limit:
    'Maximum number of log entries to return (e.g., 100). Defaults to server-side limit if not specified.',
  direction:
    'Log retrieval direction: "forward" (oldest first) or "backward" (newest first, default).',
  search: 'Search query string to filter log messages (e.g., "error", "timeout", "/api/users").',
  source: 'Filter by log source: "serverless", "edge-function", "edge-middleware", or "static".',
  level: 'Filter by log level: "info", "warning", "error", or "fatal".',
  statusCode:
    'Filter by HTTP response status code (e.g., 500 to see server errors, 404 for not found).',
  environment: 'Filter by deployment environment: "production" or "preview".',
} as const;

const GetRuntimeLogsSchema = z.object({
  projectId: z.string().min(1).describe(PARAM_DESCRIPTIONS.projectId),
  deploymentId: z.string().min(1).describe(PARAM_DESCRIPTIONS.deploymentId),
  since: z.number().optional().describe(PARAM_DESCRIPTIONS.since),
  until: z.number().optional().describe(PARAM_DESCRIPTIONS.until),
  limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
  direction: z.enum(['forward', 'backward']).optional().describe(PARAM_DESCRIPTIONS.direction),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  source: z
    .enum(['serverless', 'edge-function', 'edge-middleware', 'static'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.source),
  level: z
    .enum(['info', 'warning', 'error', 'fatal'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.level),
  statusCode: z.number().optional().describe(PARAM_DESCRIPTIONS.statusCode),
  environment: z
    .enum(['production', 'preview'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.environment),
});

const TOOL_DESCRIPTION = `Get runtime (application) logs for a Vercel deployment.

Returns runtime log entries including serverless function invocations, edge function logs, and request/response information. Supports filtering by time range, log level, source, status code, search text, and environment.

**Log retention varies by plan:** Hobby=1 hour, Pro=1 day, Enterprise=3 days. With Observability Plus add-on, up to 30 days (14 consecutive days queryable).

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

**Log sources:** serverless, edge-function, edge-middleware, static

**Use cases:**
- Debug runtime errors in serverless or edge functions
- Monitor API endpoint response times and status codes
- View application-level log output from deployed functions
- Investigate 500 errors or unexpected behavior in production
- Search for specific error messages or request paths
- Query historical logs within your plan's retention window`;

export function getRuntimeLogsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_runtime_logs',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: PARAM_DESCRIPTIONS.projectId },
        deploymentId: { type: 'string', description: PARAM_DESCRIPTIONS.deploymentId },
        since: { type: 'number', description: PARAM_DESCRIPTIONS.since },
        until: { type: 'number', description: PARAM_DESCRIPTIONS.until },
        limit: { type: 'number', description: PARAM_DESCRIPTIONS.limit },
        direction: {
          type: 'string',
          enum: ['forward', 'backward'],
          description: PARAM_DESCRIPTIONS.direction,
        },
        search: { type: 'string', description: PARAM_DESCRIPTIONS.search },
        source: {
          type: 'string',
          enum: ['serverless', 'edge-function', 'edge-middleware', 'static'],
          description: PARAM_DESCRIPTIONS.source,
        },
        level: {
          type: 'string',
          enum: ['info', 'warning', 'error', 'fatal'],
          description: PARAM_DESCRIPTIONS.level,
        },
        statusCode: { type: 'number', description: PARAM_DESCRIPTIONS.statusCode },
        environment: {
          type: 'string',
          enum: ['production', 'preview'],
          description: PARAM_DESCRIPTIONS.environment,
        },
      },
      required: ['projectId', 'deploymentId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetRuntimeLogsSchema.parse(args);
        const client = clientFactory();
        const { projectId, deploymentId, ...options } = validatedArgs;
        const result = await client.getRuntimeLogs(projectId, deploymentId, options);

        if (result.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No runtime logs found. Note: Log retention varies by Vercel plan (Hobby=1h, Pro=1d, Enterprise=3d, with Observability Plus up to 30d). The deployment may not have received traffic in the queried time range.',
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
