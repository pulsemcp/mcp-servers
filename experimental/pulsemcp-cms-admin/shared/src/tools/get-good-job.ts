import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the good job to retrieve',
} as const;

const GetGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
});

export function getGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_good_job',
    description: `Retrieve a single GoodJob background job by its ID. Returns detailed information including status, class, queue, and error details.

Example response:
{
  "id": "abc-123",
  "job_class": "SendEmailJob",
  "queue_name": "default",
  "status": "finished",
  "created_at": "2024-01-15T10:00:00Z"
}

Use cases:
- Get detailed information about a specific background job
- Check the current state of a job before retrying or discarding
- Investigate job errors and serialized parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetGoodJobSchema.parse(args);
      const client = clientFactory();

      try {
        const job = await client.getGoodJob(validatedArgs.id);

        let content = `**Good Job Details**\n\n`;
        content += `**ID:** ${job.id}\n`;
        content += `**Job Class:** ${job.job_class}\n`;
        content += `**Queue:** ${job.queue_name}\n`;
        content += `**Status:** ${job.status}\n`;

        if (job.error) {
          content += `**Error:** ${job.error}\n`;
        }
        if (job.serialized_params) {
          content += `**Params:** ${JSON.stringify(job.serialized_params, null, 2)}\n`;
        }
        if (job.scheduled_at) {
          content += `**Scheduled At:** ${job.scheduled_at}\n`;
        }
        if (job.performed_at) {
          content += `**Performed At:** ${job.performed_at}\n`;
        }
        if (job.finished_at) {
          content += `**Finished At:** ${job.finished_at}\n`;
        }
        if (job.created_at) {
          content += `**Created:** ${job.created_at}\n`;
        }
        if (job.updated_at) {
          content += `**Updated:** ${job.updated_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching good job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
