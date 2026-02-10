import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';
import { truncateLargeFields } from '../truncation.js';

const PARAM_DESCRIPTIONS = {
  observationId: 'The unique Langfuse observation ID to retrieve.',
} as const;

const GetObservationSchema = z.object({
  observationId: z.string().min(1).describe(PARAM_DESCRIPTIONS.observationId),
});

const TOOL_DESCRIPTION = `Get full details for a single Langfuse observation by ID.

Returns the complete observation including input, output, metadata, model parameters, usage details, cost details, and timing information. Use get_observations or get_trace_detail first to find observation IDs.

Any field value exceeding 1000 characters is automatically truncated and saved to a /tmp file. The truncated text includes the file path — use grep on that file to search within large values (e.g. \`grep "keyword" /tmp/langfuse_input_abc123.txt\`).

**Fields included:** id, traceId, type, name, model, modelParameters, input, output, metadata, startTime, endTime, latency, level, statusMessage, usageDetails, costDetails, promptName, promptVersion, and more.`;

export function getObservationTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_observation',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        observationId: { type: 'string', description: PARAM_DESCRIPTIONS.observationId },
      },
      required: ['observationId'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetObservationSchema.parse(args);
        const client = clientFactory();

        const observation = await client.getObservation(validated.observationId);
        const result = truncateLargeFields(observation);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting observation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
