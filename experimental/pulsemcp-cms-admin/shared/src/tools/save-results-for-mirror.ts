import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  mirror_id: 'The ID of the unofficial mirror to save results for',
  runtime_id: 'The runtime ID that was used to run the exams',
  results:
    'Array of exam results to save. Each result must include exam_id, status, and optional data.',
  exam_id: 'The exam identifier (e.g., "auth-check", "init-tools-list")',
  status: 'The result status (e.g., "pass", "fail", "error", "skip")',
  data: 'Optional detailed result data. Sensitive fields (tokens, secrets, passwords) will be automatically redacted before storage.',
} as const;

const ResultSchema = z.object({
  exam_id: z.string().describe(PARAM_DESCRIPTIONS.exam_id),
  status: z.string().describe(PARAM_DESCRIPTIONS.status),
  data: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.data),
});

const SaveResultsForMirrorSchema = z.object({
  mirror_id: z.number().describe(PARAM_DESCRIPTIONS.mirror_id),
  runtime_id: z.string().describe(PARAM_DESCRIPTIONS.runtime_id),
  results: z.array(ResultSchema).min(1).describe(PARAM_DESCRIPTIONS.results),
});

export function saveResultsForMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'save_results_for_mirror',
    description: `Save proctor exam results for an unofficial mirror. The results passed here must come exactly from a prior run_exam_for_mirror call — do not construct or modify results manually.

Results are sanitized server-side to redact sensitive data (OAuth tokens, client secrets, passwords, etc.) before being persisted.

Supports partial success - if some results fail to save, successfully saved results are still returned along with error details for failures.

Typical workflow:
1. Call run_exam_for_mirror to execute exams against a mirror
2. Extract the exam_result entries from the NDJSON response
3. Pass those results directly to this tool without modification`,
    inputSchema: {
      type: 'object',
      properties: {
        mirror_id: { type: 'number', description: PARAM_DESCRIPTIONS.mirror_id },
        runtime_id: { type: 'string', description: PARAM_DESCRIPTIONS.runtime_id },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exam_id: { type: 'string', description: PARAM_DESCRIPTIONS.exam_id },
              status: { type: 'string', description: PARAM_DESCRIPTIONS.status },
              data: {
                type: 'object',
                additionalProperties: true,
                description: PARAM_DESCRIPTIONS.data,
              },
            },
            required: ['exam_id', 'status'],
          },
          minItems: 1,
          description: PARAM_DESCRIPTIONS.results,
        },
      },
      required: ['mirror_id', 'runtime_id', 'results'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SaveResultsForMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.saveResultsForMirror({
          mirror_id: validatedArgs.mirror_id,
          runtime_id: validatedArgs.runtime_id,
          results: validatedArgs.results,
        });

        let content = `**Proctor Results Saved**\n\n`;
        content += `Mirror ID: ${validatedArgs.mirror_id}\n`;
        content += `Runtime: ${validatedArgs.runtime_id}\n\n`;

        if (response.saved.length > 0) {
          content += `**Successfully Saved (${response.saved.length}):**\n`;
          for (const saved of response.saved) {
            content += `- ${saved.exam_id} (Result ID: ${saved.proctor_result_id})\n`;
          }
          content += '\n';
        }

        if (response.errors.length > 0) {
          content += `**Errors (${response.errors.length}):**\n`;
          for (const error of response.errors) {
            if (typeof error === 'string') {
              content += `- ${error}\n`;
            } else {
              content += `- ${error.exam_id}: ${error.error}\n`;
            }
          }
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error saving proctor results: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
