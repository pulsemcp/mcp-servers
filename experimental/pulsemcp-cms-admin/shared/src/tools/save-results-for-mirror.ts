import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { examResultStore } from '../exam-result-store.js';

const PARAM_DESCRIPTIONS = {
  mirror_id: 'The ID of the unofficial mirror to save results for',
  runtime_id: 'The runtime ID that was used to run the exams',
  result_id:
    'The UUID returned by run_exam_for_mirror. When provided, the server retrieves the full result from the in-memory store — no need to pass the results array. This is the preferred approach.',
  results:
    'Array of exam results to save. Each result must include exam_id, status, and optional data. Only needed if result_id is not provided.',
  exam_id: 'The exam identifier (e.g., "auth-check", "init-tools-list")',
  status: 'The result status (e.g., "pass", "fail", "error", "skip")',
  data: 'Optional detailed result data. Sensitive fields (tokens, secrets, passwords) will be automatically redacted before storage.',
} as const;

const ResultSchema = z.object({
  exam_id: z.string().describe(PARAM_DESCRIPTIONS.exam_id),
  status: z.string().describe(PARAM_DESCRIPTIONS.status),
  data: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.data),
});

const SaveResultsForMirrorSchema = z
  .object({
    mirror_id: z.number().describe(PARAM_DESCRIPTIONS.mirror_id),
    runtime_id: z.string().optional().describe(PARAM_DESCRIPTIONS.runtime_id),
    result_id: z.string().uuid().optional().describe(PARAM_DESCRIPTIONS.result_id),
    results: z.array(ResultSchema).optional().describe(PARAM_DESCRIPTIONS.results),
  })
  .refine((data) => data.result_id || (data.results && data.results.length > 0), {
    message: 'Either result_id or a non-empty results array must be provided',
  })
  .refine((data) => !(data.result_id && data.results && data.results.length > 0), {
    message:
      'Provide either result_id or results, not both. Use result_id (preferred) to retrieve from the store, or results for direct submission.',
  });

export function saveResultsForMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'save_results_for_mirror',
    description: `Save proctor exam results for an unofficial mirror.

**Preferred**: Pass the \`result_id\` returned by \`run_exam_for_mirror\`. The full result is retrieved from the in-memory store server-side — no need to pass the large results payload through the LLM context.

**Fallback**: Pass results directly (as before) if result_id is not available.

Results are sanitized server-side to redact sensitive data (OAuth tokens, client secrets, passwords, etc.) before being persisted.

Supports partial success - if some results fail to save, successfully saved results are still returned along with error details for failures.

Typical workflow:
1. Call run_exam_for_mirror — note the returned result_id
2. Call save_results_for_mirror with result_id and mirror_id
3. Results are saved without the LLM needing to parse or relay the full payload`,
    inputSchema: {
      type: 'object',
      properties: {
        mirror_id: { type: 'number', description: PARAM_DESCRIPTIONS.mirror_id },
        runtime_id: { type: 'string', description: PARAM_DESCRIPTIONS.runtime_id },
        result_id: {
          type: 'string',
          format: 'uuid',
          description: PARAM_DESCRIPTIONS.result_id,
        },
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
          description: PARAM_DESCRIPTIONS.results,
        },
      },
      required: ['mirror_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SaveResultsForMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        let results = validatedArgs.results;
        let runtimeId = validatedArgs.runtime_id;

        // If result_id is provided, retrieve from the store
        if (validatedArgs.result_id) {
          const stored = examResultStore.get(validatedArgs.result_id);
          if (!stored) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No stored result found for result_id "${validatedArgs.result_id}". Results are stored in-memory and may have been lost if the server restarted. Pass the results array directly instead.`,
                },
              ],
              isError: true,
            };
          }

          // Extract exam_result lines from stored data
          results = stored.lines
            .filter((line) => line.type === 'exam_result')
            .map((line) => ({
              exam_id: (line.exam_id || line.exam_type || 'unknown') as string,
              status: (line.status || 'unknown') as string,
              ...(line.data ? { data: line.data as Record<string, unknown> } : {}),
            }));

          if (!runtimeId) {
            runtimeId = stored.runtime_id;
          }
        }

        if (!results || results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No exam results to save. Either provide a result_id from run_exam_for_mirror or pass results directly.',
              },
            ],
            isError: true,
          };
        }

        if (!runtimeId) {
          return {
            content: [
              {
                type: 'text',
                text: 'runtime_id is required. Provide it directly or use a result_id which includes the runtime_id.',
              },
            ],
            isError: true,
          };
        }

        const response = await client.saveResultsForMirror({
          mirror_id: validatedArgs.mirror_id,
          runtime_id: runtimeId,
          results,
        });

        let content = `**Proctor Results Saved**\n\n`;
        content += `Mirror ID: ${validatedArgs.mirror_id}\n`;
        content += `Runtime: ${runtimeId}\n`;
        if (validatedArgs.result_id) {
          content += `Result ID: ${validatedArgs.result_id}\n`;
        }
        content += '\n';

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

        // Clean up stored result after successful save (all results persisted)
        if (validatedArgs.result_id && response.errors.length === 0) {
          examResultStore.delete(validatedArgs.result_id);
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
