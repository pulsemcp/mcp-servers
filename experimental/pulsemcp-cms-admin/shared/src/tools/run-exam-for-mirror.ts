import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { examResultStore, extractExamId, extractStatus } from '../exam-result-store.js';

const PARAM_DESCRIPTIONS = {
  mirror_ids:
    'Array of unofficial mirror IDs to run exams against. Mirrors without saved mcp_json configs will be skipped.',
  runtime_id:
    'The Fly Machines runtime ID to use for running the exam containers (e.g., "fly-machines-v1")',
  exam_type:
    'Type of exam to run: "auth-check" (verify authentication), "init-tools-list" (verify server initialization and tool listing), or "both" (run both exams)',
  max_retries: 'Maximum number of retries for failed exams, range 0-10. Default: 0',
} as const;

const RunExamForMirrorSchema = z.object({
  mirror_ids: z.array(z.number()).min(1).describe(PARAM_DESCRIPTIONS.mirror_ids),
  runtime_id: z.string().describe(PARAM_DESCRIPTIONS.runtime_id),
  exam_type: z
    .enum(['auth-check', 'init-tools-list', 'both'])
    .describe(PARAM_DESCRIPTIONS.exam_type),
  max_retries: z.number().min(0).max(10).optional().describe(PARAM_DESCRIPTIONS.max_retries),
});

/**
 * Build a truncated summary of exam results for the LLM response.
 * Omits large keys like full input schemas from tool listings to keep
 * the payload within MCP size limits. The full result is accessible
 * via the `get_exam_result` tool using the returned `result_id`.
 */
function truncateExamResultData(data: Record<string, unknown>): Record<string, unknown> {
  const truncated: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === 'tools' && Array.isArray(value)) {
      // For tool listings, include only name and description, omit inputSchema
      truncated[key] = value.map((tool: Record<string, unknown>) => ({
        name: tool.name,
        ...(tool.description ? { description: String(tool.description).slice(0, 100) } : {}),
      }));
      truncated['tools_count'] = value.length;
      truncated['tools_truncated'] = true;
    } else if (key === 'inputSchema' || key === 'input_schema') {
      // Omit full input schemas
      truncated[key] = '(truncated — use get_exam_result to see full data)';
    } else if (typeof value === 'string' && value.length > 500) {
      truncated[key] = value.slice(0, 500) + '... (truncated)';
    } else if (typeof value === 'object' && value !== null) {
      const serialized = JSON.stringify(value);
      if (serialized.length > 1000) {
        truncated[key] = '(truncated — use get_exam_result to see full data)';
      } else {
        truncated[key] = value;
      }
    } else {
      truncated[key] = value;
    }
  }

  return truncated;
}

export function runExamForMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'run_exam_for_mirror',
    description: `Run proctor exams against unofficial mirrors to test their MCP server configurations. Proctor spins up Docker containers on Fly Machines and runs standardized exams to verify mirrors work correctly.

Available exam types:
- **auth-check**: Verifies the authentication type and whether the mirror responds correctly to auth flows (e.g., OAuth2)
- **init-tools-list**: Connects to the mirror and retrieves its list of MCP tools, verifying the server initializes properly
- **both**: Runs both exams sequentially

Mirrors without saved mcp_json configurations are automatically skipped.

Results are stored server-side in a local file and a \`result_id\` UUID is returned. The response includes a truncated summary (status, tool names/counts, errors) that fits within MCP size limits. Use \`get_exam_result\` to drill into full details, or pass the \`result_id\` directly to \`save_results_for_mirror\`.

Use cases:
- Test if an unofficial mirror's MCP server is working correctly before linking it
- Verify authentication configuration for a mirror
- Batch-test multiple mirrors at once
- Debug mirror connectivity or configuration issues`,
    inputSchema: {
      type: 'object',
      properties: {
        mirror_ids: {
          type: 'array',
          items: { type: 'number' },
          minItems: 1,
          description: PARAM_DESCRIPTIONS.mirror_ids,
        },
        runtime_id: { type: 'string', description: PARAM_DESCRIPTIONS.runtime_id },
        exam_type: {
          type: 'string',
          enum: ['auth-check', 'init-tools-list', 'both'],
          description: PARAM_DESCRIPTIONS.exam_type,
        },
        max_retries: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          description: PARAM_DESCRIPTIONS.max_retries,
        },
      },
      required: ['mirror_ids', 'runtime_id', 'exam_type'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RunExamForMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.runExamForMirror({
          mirror_ids: validatedArgs.mirror_ids,
          runtime_id: validatedArgs.runtime_id,
          exam_type: validatedArgs.exam_type,
          max_retries: validatedArgs.max_retries,
        });

        // Store the full result server-side
        const resultId = examResultStore.store(
          validatedArgs.mirror_ids,
          validatedArgs.runtime_id,
          validatedArgs.exam_type,
          response.lines
        );

        let content = `**Proctor Exam Results**\n\n`;
        content += `Result ID: ${resultId}\n`;
        content += `Mirrors: ${validatedArgs.mirror_ids.join(', ')}\n`;
        content += `Exam Type: ${validatedArgs.exam_type}\n`;
        content += `Runtime: ${validatedArgs.runtime_id}\n\n`;

        for (const line of response.lines) {
          switch (line.type) {
            case 'log':
              content += `[LOG] ${line.message || JSON.stringify(line)}\n`;
              break;
            case 'exam_result': {
              const data = line.data as Record<string, unknown> | undefined;
              const mirrorId = line.mirror_id ?? data?.mirror_id ?? 'unknown';
              content += `\n**Exam Result** (Mirror: ${mirrorId})\n`;
              content += `  Exam: ${extractExamId(line)}\n`;
              content += `  Status: ${extractStatus(line)}\n`;
              if (data) {
                const truncatedData = truncateExamResultData(data);
                content += `  Data: ${JSON.stringify(truncatedData, null, 2)}\n`;
              }
              break;
            }
            case 'summary':
              content += `\n**Summary**\n`;
              content += `  Total: ${line.total || 0}\n`;
              content += `  Passed: ${line.passed || 0}\n`;
              content += `  Failed: ${line.failed || 0}\n`;
              content += `  Skipped: ${line.skipped || 0}\n`;
              break;
            case 'error':
              content += `\n**Error**: ${line.message || line.error || JSON.stringify(line)}\n`;
              break;
            default:
              content += `${JSON.stringify(line)}\n`;
          }
        }

        content += `\n\nUse \`get_exam_result\` with result_id "${resultId}" to see full untruncated data.`;
        content += `\nUse \`save_results_for_mirror\` with result_id "${resultId}" to save these results.`;

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error running proctor exam: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
