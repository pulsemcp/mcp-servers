import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { examResultStore } from '../exam-result-store.js';

const PARAM_DESCRIPTIONS = {
  result_id: 'The UUID returned by run_exam_for_mirror identifying the stored result to retrieve.',
  section:
    'Optional filter to retrieve only a specific section of the result. "exam_results" returns only exam_result lines, "logs" returns only log lines, "summary" returns only the summary line, "errors" returns only error lines. If omitted, returns all lines.',
  mirror_id:
    'Optional mirror ID filter. When provided, only returns exam_result lines for this specific mirror. Useful when the exam was run against multiple mirrors.',
} as const;

const GetExamResultSchema = z.object({
  result_id: z.string().uuid().describe(PARAM_DESCRIPTIONS.result_id),
  section: z
    .enum(['exam_results', 'logs', 'summary', 'errors'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.section),
  mirror_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mirror_id),
});

export function getExamResult(_server: Server, _clientFactory: ClientFactory) {
  return {
    name: 'get_exam_result',
    description: `Retrieve the full, untruncated proctor exam result stored by a prior run_exam_for_mirror call.

run_exam_for_mirror returns a truncated summary to keep the response within MCP size limits. This tool provides on-demand access to the complete result data, including full tool input schemas and detailed exam output.

Supports filtering by section (exam_results, logs, summary, errors) and by mirror_id to drill into specific parts of the result without loading the entire payload.

**Tip**: For servers with many tools, the full result can be very large. Use the section and/or mirror_id filters to retrieve only the data you need.

Typical usage:
1. Call run_exam_for_mirror — note the returned result_id
2. Call get_exam_result with that result_id and a section filter (e.g., section="exam_results")
3. Optionally add mirror_id to narrow further for multi-mirror exams`,
    inputSchema: {
      type: 'object',
      properties: {
        result_id: { type: 'string', format: 'uuid', description: PARAM_DESCRIPTIONS.result_id },
        section: {
          type: 'string',
          enum: ['exam_results', 'logs', 'summary', 'errors'],
          description: PARAM_DESCRIPTIONS.section,
        },
        mirror_id: { type: 'number', description: PARAM_DESCRIPTIONS.mirror_id },
      },
      required: ['result_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetExamResultSchema.parse(args);
      const stored = examResultStore.get(validatedArgs.result_id);

      if (!stored) {
        return {
          content: [
            {
              type: 'text',
              text: `No stored result found for result_id "${validatedArgs.result_id}". The result file may have been cleaned up or the /tmp directory cleared.`,
            },
          ],
          isError: true,
        };
      }

      let lines = stored.lines;

      // Filter by section
      if (validatedArgs.section) {
        const typeMap: Record<string, string> = {
          exam_results: 'exam_result',
          logs: 'log',
          summary: 'summary',
          errors: 'error',
        };
        const targetType = typeMap[validatedArgs.section];
        lines = lines.filter((line) => line.type === targetType);
      }

      // Filter by mirror_id
      if (validatedArgs.mirror_id !== undefined) {
        lines = lines.filter(
          (line) => line.type !== 'exam_result' || line.mirror_id === validatedArgs.mirror_id
        );
      }

      let content = `**Exam Result Details**\n\n`;
      content += `Result ID: ${stored.result_id}\n`;
      content += `Mirrors: ${stored.mirror_ids.join(', ')}\n`;
      content += `Exam Type: ${stored.exam_type}\n`;
      content += `Runtime: ${stored.runtime_id}\n`;
      content += `Stored At: ${stored.stored_at}\n`;

      if (validatedArgs.section) {
        content += `Section Filter: ${validatedArgs.section}\n`;
      }
      if (validatedArgs.mirror_id !== undefined) {
        content += `Mirror Filter: ${validatedArgs.mirror_id}\n`;
      }

      content += `\n---\n\n`;

      if (lines.length === 0) {
        content += 'No matching lines found for the given filters.\n';
      } else {
        for (const line of lines) {
          content += JSON.stringify(line, null, 2) + '\n\n';
        }
      }

      return { content: [{ type: 'text', text: content.trim() }] };
    },
  };
}
