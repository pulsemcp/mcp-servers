import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  runtime_id: 'Runtime ID used for the exam, or "__custom__" if a custom Docker image was used.',
  exam_id: 'Exam ID that was executed.',
  results: 'Exam results as a JSON string or object.',
  custom_runtime_image:
    'Required if runtime_id is "__custom__". The Docker image URL that was used.',
} as const;

const SaveResultSchema = z.object({
  runtime_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.runtime_id),
  exam_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.exam_id),
  results: z.union([z.string(), z.record(z.unknown())]).describe(PARAM_DESCRIPTIONS.results),
  custom_runtime_image: z.string().optional().describe(PARAM_DESCRIPTIONS.custom_runtime_image),
});

export function saveResult(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'save_result',
    description: `Save exam results to the database for future comparison.

Stores the results of a Proctor exam run so they can be retrieved later for
comparison with new test runs.

**Returns:**
- success: boolean indicating if the save was successful
- id: ID of the saved result record

**Use cases:**
- Persist exam results after running tests
- Create a baseline for future comparisons
- Track test history for an MCP server

**Note:**
- Custom runtime images require the custom_runtime_image parameter`,
    inputSchema: {
      type: 'object',
      properties: {
        runtime_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.runtime_id,
        },
        exam_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.exam_id,
        },
        results: {
          oneOf: [{ type: 'string' }, { type: 'object' }],
          description: PARAM_DESCRIPTIONS.results,
        },
        custom_runtime_image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.custom_runtime_image,
        },
      },
      required: ['runtime_id', 'exam_id', 'results'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SaveResultSchema.parse(args);

      // Validate custom runtime requirements
      if (validatedArgs.runtime_id === '__custom__' && !validatedArgs.custom_runtime_image) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: custom_runtime_image is required when runtime_id is "__custom__"',
            },
          ],
          isError: true,
        };
      }

      const client = clientFactory();

      try {
        const response = await client.saveResult({
          runtime_id: validatedArgs.runtime_id,
          exam_id: validatedArgs.exam_id,
          results: validatedArgs.results,
          custom_runtime_image: validatedArgs.custom_runtime_image,
        });

        let content = '## Result Saved\n\n';
        content += `**Success:** ${response.success}\n`;
        content += `**Result ID:** ${response.id}\n\n`;
        content += 'The exam result has been saved.';

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error saving result: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
