import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';
import { truncateLargeFields } from '../truncation.js';

const PARAM_DESCRIPTIONS = {
  page: 'Page number (starts at 1). Default: 1.',
  limit:
    'Number of traces per page (1-100). Default: 10. Use smaller values to reduce response size.',
  userId: 'Filter by user ID associated with traces.',
  name: 'Filter by trace name (exact match).',
  sessionId: 'Filter by session ID.',
  fromTimestamp:
    'Only include traces created on or after this ISO 8601 datetime. Example: "2025-01-01T00:00:00Z".',
  toTimestamp:
    'Only include traces created before this ISO 8601 datetime. Example: "2025-02-01T00:00:00Z".',
  orderBy:
    'Sort order as "field.direction". Fields: id, timestamp, name, userId, release, version, public, bookmarked, sessionId. Direction: asc, desc. Example: "timestamp.desc".',
  tags: 'Filter to traces containing ALL specified tags. Example: ["production", "important"].',
  version: 'Filter by trace version string.',
  release: 'Filter by release version string.',
  environment: 'Filter by environment(s). Example: ["production", "staging"].',
} as const;

const GetTracesSchema = z.object({
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  userId: z.string().optional().describe(PARAM_DESCRIPTIONS.userId),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  sessionId: z.string().optional().describe(PARAM_DESCRIPTIONS.sessionId),
  fromTimestamp: z.string().optional().describe(PARAM_DESCRIPTIONS.fromTimestamp),
  toTimestamp: z.string().optional().describe(PARAM_DESCRIPTIONS.toTimestamp),
  orderBy: z.string().optional().describe(PARAM_DESCRIPTIONS.orderBy),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
  version: z.string().optional().describe(PARAM_DESCRIPTIONS.version),
  release: z.string().optional().describe(PARAM_DESCRIPTIONS.release),
  environment: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.environment),
});

const TOOL_DESCRIPTION = `List traces from Langfuse with optional filters and pagination.

Returns a summary of each trace: id, name, timestamp, userId, latency, totalCost, tags, and observation/score counts. The input and output fields are omitted from the list view for brevity — use get_trace_detail to see the full trace including I/O.

Any field value exceeding 1000 characters is automatically truncated and saved to a /tmp file. The truncated text includes the file path — use grep on that file to search within large values.

**Pagination:** Use page and limit to paginate. Response includes meta.totalItems and meta.totalPages.

**Sorting:** Use orderBy (e.g. "timestamp.desc") to control result order.`;

export function getTracesTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_traces',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number', description: PARAM_DESCRIPTIONS.page, minimum: 1 },
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
          minimum: 1,
          maximum: 100,
        },
        userId: { type: 'string', description: PARAM_DESCRIPTIONS.userId },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        sessionId: { type: 'string', description: PARAM_DESCRIPTIONS.sessionId },
        fromTimestamp: { type: 'string', description: PARAM_DESCRIPTIONS.fromTimestamp },
        toTimestamp: { type: 'string', description: PARAM_DESCRIPTIONS.toTimestamp },
        orderBy: { type: 'string', description: PARAM_DESCRIPTIONS.orderBy },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
        version: { type: 'string', description: PARAM_DESCRIPTIONS.version },
        release: { type: 'string', description: PARAM_DESCRIPTIONS.release },
        environment: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.environment,
        },
      },
      required: [] as string[],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetTracesSchema.parse(args || {});
        const client = clientFactory();

        const response = await client.getTraces({
          page: validated.page,
          limit: validated.limit || 10,
          userId: validated.userId,
          name: validated.name,
          sessionId: validated.sessionId,
          fromTimestamp: validated.fromTimestamp,
          toTimestamp: validated.toTimestamp,
          orderBy: validated.orderBy,
          tags: validated.tags,
          version: validated.version,
          release: validated.release,
          environment: validated.environment,
        });

        // Strip verbose fields from list view for minimal default output
        const minimalData = response.data.map((trace) => ({
          id: trace.id,
          name: trace.name,
          timestamp: trace.timestamp,
          userId: trace.userId,
          sessionId: trace.sessionId,
          tags: trace.tags,
          environment: trace.environment,
          latency: trace.latency,
          totalCost: trace.totalCost,
          observationCount: trace.observations?.length ?? 0,
          scoreCount: trace.scores?.length ?? 0,
          htmlPath: trace.htmlPath,
        }));

        const result = truncateLargeFields({
          data: minimalData,
          meta: response.meta,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing traces: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
