import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';
import { truncateLargeFields } from '../truncation.js';

const PARAM_DESCRIPTIONS = {
  page: 'Page number (starts at 1). Default: 1.',
  limit: 'Number of observations per page (1-100). Default: 10.',
  traceId:
    'Filter by trace ID. This is the most common filter — use it to get all observations for a specific trace.',
  name: 'Filter by observation name (exact match).',
  userId: 'Filter by user ID.',
  type: 'Filter by observation type: GENERATION, SPAN, or EVENT.',
  level: 'Filter by observation level: DEBUG, DEFAULT, WARNING, or ERROR.',
  parentObservationId: 'Filter by parent observation ID to get direct children.',
  fromStartTime: 'Only include observations with startTime on or after this ISO 8601 datetime.',
  toStartTime: 'Only include observations with startTime before this ISO 8601 datetime.',
  version: 'Filter by observation version string.',
  environment: 'Filter by environment(s). Example: ["production"].',
} as const;

const GetObservationsSchema = z.object({
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  traceId: z.string().optional().describe(PARAM_DESCRIPTIONS.traceId),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  userId: z.string().optional().describe(PARAM_DESCRIPTIONS.userId),
  type: z.string().optional().describe(PARAM_DESCRIPTIONS.type),
  level: z.string().optional().describe(PARAM_DESCRIPTIONS.level),
  parentObservationId: z.string().optional().describe(PARAM_DESCRIPTIONS.parentObservationId),
  fromStartTime: z.string().optional().describe(PARAM_DESCRIPTIONS.fromStartTime),
  toStartTime: z.string().optional().describe(PARAM_DESCRIPTIONS.toStartTime),
  version: z.string().optional().describe(PARAM_DESCRIPTIONS.version),
  environment: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.environment),
});

const TOOL_DESCRIPTION = `List observations from Langfuse with optional filters and pagination.

Returns a summary of each observation: id, traceId, type, name, model, timing, level, and usage/cost metrics. The input and output fields are omitted from the list view for brevity — use get_observation with a specific observation ID to see the full I/O.

Typically used with traceId filter to list all observations within a specific trace. Can also be used to search across all traces by type, level, etc.

Any field value exceeding 1000 characters is automatically truncated and saved to a /tmp file. The truncated text includes the file path — use grep on that file to search within large values.

**Pagination:** Use page and limit to paginate. Response includes meta.totalItems and meta.totalPages.`;

export function getObservationsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_observations',
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
        traceId: { type: 'string', description: PARAM_DESCRIPTIONS.traceId },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        userId: { type: 'string', description: PARAM_DESCRIPTIONS.userId },
        type: { type: 'string', description: PARAM_DESCRIPTIONS.type },
        level: { type: 'string', description: PARAM_DESCRIPTIONS.level },
        parentObservationId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.parentObservationId,
        },
        fromStartTime: { type: 'string', description: PARAM_DESCRIPTIONS.fromStartTime },
        toStartTime: { type: 'string', description: PARAM_DESCRIPTIONS.toStartTime },
        version: { type: 'string', description: PARAM_DESCRIPTIONS.version },
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
        const validated = GetObservationsSchema.parse(args || {});
        const client = clientFactory();

        const response = await client.getObservations({
          page: validated.page,
          limit: validated.limit || 10,
          traceId: validated.traceId,
          name: validated.name,
          userId: validated.userId,
          type: validated.type,
          level: validated.level,
          parentObservationId: validated.parentObservationId,
          fromStartTime: validated.fromStartTime,
          toStartTime: validated.toStartTime,
          version: validated.version,
          environment: validated.environment,
        });

        // Strip verbose fields from list view
        const minimalData = response.data.map((obs) => ({
          id: obs.id,
          traceId: obs.traceId,
          type: obs.type,
          name: obs.name,
          model: obs.model,
          startTime: obs.startTime,
          endTime: obs.endTime,
          level: obs.level,
          statusMessage: obs.statusMessage,
          parentObservationId: obs.parentObservationId,
          latency: obs.latency,
          usageDetails: obs.usageDetails,
          costDetails: obs.costDetails,
          version: obs.version,
          environment: obs.environment,
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
              text: `Error listing observations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
