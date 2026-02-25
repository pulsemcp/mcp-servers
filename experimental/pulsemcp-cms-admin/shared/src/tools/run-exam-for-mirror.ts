import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

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

export function runExamForMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'run_exam_for_mirror',
    description: `Run proctor exams against unofficial mirrors to test their MCP server configurations. Proctor spins up Docker containers on Fly Machines and runs standardized exams to verify mirrors work correctly.

Available exam types:
- **auth-check**: Verifies the authentication type and whether the mirror responds correctly to auth flows (e.g., OAuth2)
- **init-tools-list**: Connects to the mirror and retrieves its list of MCP tools, verifying the server initializes properly
- **both**: Runs both exams sequentially

Mirrors without saved mcp_json configurations are automatically skipped. Results are returned as a stream of events including logs, exam results, and a final summary.

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

        let content = `**Proctor Exam Results**\n\n`;
        content += `Mirrors: ${validatedArgs.mirror_ids.join(', ')}\n`;
        content += `Exam Type: ${validatedArgs.exam_type}\n`;
        content += `Runtime: ${validatedArgs.runtime_id}\n\n`;

        for (const line of response.lines) {
          switch (line.type) {
            case 'log':
              content += `[LOG] ${line.message || JSON.stringify(line)}\n`;
              break;
            case 'exam_result':
              content += `\n**Exam Result** (Mirror: ${line.mirror_id || 'unknown'})\n`;
              content += `  Exam: ${line.exam_id || line.exam_type || 'unknown'}\n`;
              content += `  Status: ${line.status || 'unknown'}\n`;
              if (line.data) {
                content += `  Data: ${JSON.stringify(line.data, null, 2)}\n`;
              }
              break;
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
