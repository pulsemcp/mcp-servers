import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  mirror_id: 'ID of the unofficial mirror to get prior results for.',
  exam_id: 'Exam ID to filter results by.',
  input_json:
    'Optional JSON string of the current mcp.json for matching. If provided, returns the most recent result with matching config.',
} as const;

const GetPriorResultSchema = z.object({
  mirror_id: z.number().describe(PARAM_DESCRIPTIONS.mirror_id),
  exam_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.exam_id),
  input_json: z.string().optional().describe(PARAM_DESCRIPTIONS.input_json),
});

export function getPriorResult(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_prior_result',
    description: `Retrieve a previous exam result for comparison.

Finds the most recent prior result for the specified mirror and exam, optionally
matching against the current input configuration.

**Returns:**
- id: Result record ID
- datetime_performed: When the exam was run (ISO 8601)
- results: The full exam results
- runtime_image: Docker image used for the exam
- match_type: "exact" if mcp.json matches exactly, "entry_key" if only entry key matches

**Use cases:**
- Compare current test results with previous runs
- Detect regressions in MCP server functionality
- Review historical test outcomes
- Validate that changes haven't broken existing behavior

**Note:**
- Returns 404 if no prior result exists
- The match_type indicates how closely the prior result matches your input_json`,
    inputSchema: {
      type: 'object',
      properties: {
        mirror_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.mirror_id,
        },
        exam_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.exam_id,
        },
        input_json: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.input_json,
        },
      },
      required: ['mirror_id', 'exam_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetPriorResultSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getPriorResult({
          mirror_id: validatedArgs.mirror_id,
          exam_id: validatedArgs.exam_id,
          input_json: validatedArgs.input_json,
        });

        let content = '## Prior Result\n\n';
        content += `**Result ID:** ${response.id}\n`;
        content += `**Date Performed:** ${response.datetime_performed}\n`;
        content += `**Runtime Image:** ${response.runtime_image}\n`;
        content += `**Match Type:** ${response.match_type}\n\n`;

        content += '### Results\n\n```json\n';
        content += JSON.stringify(response.results, null, 2);
        content += '\n```\n';

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Handle "no prior result found" as a non-error case
        if (message.includes('No prior result found')) {
          return {
            content: [
              {
                type: 'text',
                text: 'No prior result found for this mirror and exam combination.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Error getting prior result: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
