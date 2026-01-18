import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  machine_id:
    'ID of the Fly.io machine running the exam. Get this from get_machines. Must contain only alphanumeric characters, underscores, and hyphens.',
  exam_id:
    'ID of the exam to cancel. Must match the exam currently running on the machine. Must contain only alphanumeric characters and hyphens.',
} as const;

const CancelExamSchema = z.object({
  machine_id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Machine ID must contain only alphanumeric characters, underscores, and hyphens')
    .describe(PARAM_DESCRIPTIONS.machine_id),
  exam_id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9-]+$/, 'Exam ID must contain only alphanumeric characters and hyphens')
    .describe(PARAM_DESCRIPTIONS.exam_id),
});

export function cancelExam(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'cancel_exam',
    description: `Cancel a running Proctor exam.

Stops an exam that is currently executing on a Fly machine. This is useful
when you need to abort a test that is taking too long or encountering issues.

**Returns:**
- Result object indicating the cancellation status

**Use cases:**
- Stop a stuck or slow exam
- Cancel a test started with wrong parameters
- Free up resources for other tests
- Gracefully terminate a running exam before destroying the machine

**Note:**
- The exam must be currently running on the specified machine
- After cancellation, the machine may still need to be destroyed separately
- Results from a cancelled exam will not be saved automatically`,
    inputSchema: {
      type: 'object',
      properties: {
        machine_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.machine_id,
        },
        exam_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.exam_id,
        },
      },
      required: ['machine_id', 'exam_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CancelExamSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.cancelExam({
          machine_id: validatedArgs.machine_id,
          exam_id: validatedArgs.exam_id,
        });

        let content = '## Exam Cancellation\n\n';
        content += `**Machine ID:** ${validatedArgs.machine_id}\n`;
        content += `**Exam ID:** ${validatedArgs.exam_id}\n\n`;

        if (response.success) {
          content += 'The exam has been cancelled successfully.';
        } else if (response.message) {
          content += `Result: ${response.message}`;
        } else {
          content += 'Cancellation request sent.\n\n';
          content += '```json\n';
          content += JSON.stringify(response, null, 2);
          content += '\n```';
        }

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
              text: `Error cancelling exam: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
