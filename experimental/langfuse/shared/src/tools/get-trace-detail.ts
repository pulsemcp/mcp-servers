import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';
import { truncateLargeFields } from '../truncation.js';

const PARAM_DESCRIPTIONS = {
  traceId: 'The unique Langfuse trace ID to retrieve.',
} as const;

const GetTraceDetailSchema = z.object({
  traceId: z.string().min(1).describe(PARAM_DESCRIPTIONS.traceId),
});

const TOOL_DESCRIPTION = `Get full details for a single Langfuse trace by ID.

Returns the complete trace including input, output, metadata, and all nested observations and scores. This is the detailed view — use get_traces to browse and find trace IDs first.

Any field value exceeding 1000 characters is automatically truncated and saved to a /tmp file. The truncated text includes the file path — use grep on that file to search within large values (e.g. \`grep "keyword" /tmp/langfuse_input_abc123.txt\`).

**Observations** are returned as a flat list with parentObservationId for tree reconstruction. Each observation includes type (SPAN, GENERATION, EVENT), timing, model info, input/output, and usage/cost details.

**Scores** include evaluations attached to this trace with their values and data types.`;

export function getTraceDetailTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_trace_detail',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        traceId: { type: 'string', description: PARAM_DESCRIPTIONS.traceId },
      },
      required: ['traceId'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetTraceDetailSchema.parse(args);
        const client = clientFactory();

        const trace = await client.getTraceDetail(validated.traceId);
        const result = truncateLargeFields(trace);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting trace detail: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
