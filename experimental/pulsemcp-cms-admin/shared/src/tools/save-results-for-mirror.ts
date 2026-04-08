import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { examResultStore, extractExamId, extractStatus } from '../exam-result-store.js';

const PARAM_DESCRIPTIONS = {
  mirror_id: 'The ID of the unofficial mirror to save results for',
  runtime_id: 'The runtime ID that was used to run the exams',
  result_id:
    'The UUID returned by run_exam_for_mirror. The server retrieves the full result from the local file store automatically.',
} as const;

const SaveResultsForMirrorSchema = z.object({
  mirror_id: z.number().describe(PARAM_DESCRIPTIONS.mirror_id),
  runtime_id: z.string().optional().describe(PARAM_DESCRIPTIONS.runtime_id),
  result_id: z.string().uuid().describe(PARAM_DESCRIPTIONS.result_id),
});

export function saveResultsForMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'save_results_for_mirror',
    description: `Save proctor exam results for an unofficial mirror.

Pass the \`result_id\` returned by \`run_exam_for_mirror\`. The full result is retrieved from the local file store server-side — no need to pass the large results payload through the LLM context.

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
      },
      required: ['mirror_id', 'result_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SaveResultsForMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const stored = examResultStore.get(validatedArgs.result_id);
        if (!stored) {
          return {
            content: [
              {
                type: 'text',
                text: `No stored result found for result_id "${validatedArgs.result_id}". The result file may have been cleaned up or the /tmp directory cleared. Re-run run_exam_for_mirror to generate a new result.`,
              },
            ],
            isError: true,
          };
        }

        // Extract exam_result lines from stored data.
        //
        // The real proctor API returns a deeply nested structure:
        //   line.data = {
        //     mirror_id, server_slug, exam_id, ...,
        //     result: {                          ← envelope
        //       exam_id, machine_id, status,
        //       result: {                        ← actual payload
        //         input: {...}, output: {...}, processedBy: {...}
        //       },
        //       error, logs
        //     }
        //   }
        //
        // The PulseMCP API expects the actual payload { input, output,
        // processedBy } at the top level of the saved results column.
        // We must unwrap through data.result.result to reach it.
        const results = stored.lines
          .filter((line) => line.type === 'exam_result')
          .map((line) => {
            const data = line.data as Record<string, unknown> | undefined;
            // Unwrap nested result objects to find the exam payload
            // containing { input, output, processedBy }.
            let resultData: Record<string, unknown> | undefined = data;
            // Level 1: data.result (envelope with exam_id, machine_id, logs, etc.)
            if (
              resultData?.result &&
              typeof resultData.result === 'object' &&
              !Array.isArray(resultData.result)
            ) {
              resultData = resultData.result as Record<string, unknown>;
              // Level 2: data.result.result (actual payload with input, output, processedBy)
              if (
                resultData.result &&
                typeof resultData.result === 'object' &&
                !Array.isArray(resultData.result)
              ) {
                resultData = resultData.result as Record<string, unknown>;
              }
            }
            return {
              exam_id: extractExamId(line),
              status: extractStatus(line),
              ...(resultData ? { data: resultData } : {}),
            };
          });

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No exam results found in the stored result. The stored data may not contain any exam_result lines.',
              },
            ],
            isError: true,
          };
        }

        const runtimeId = validatedArgs.runtime_id || stored.runtime_id;
        if (!runtimeId) {
          return {
            content: [
              {
                type: 'text',
                text: 'runtime_id is required. Provide it directly or ensure the stored result includes it.',
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
        content += `Result ID: ${validatedArgs.result_id}\n`;
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
        if (response.errors.length === 0) {
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
