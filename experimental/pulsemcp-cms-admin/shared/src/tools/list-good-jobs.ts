import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { GoodJobStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  queue_name: 'Filter jobs by queue name',
  status: 'Filter by job status (scheduled, queued, running, succeeded, failed, discarded)',
  job_class: 'Filter by job class name',
  after: 'Filter jobs scheduled after this date (ISO 8601 format)',
  before: 'Filter jobs scheduled before this date (ISO 8601 format)',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const ListGoodJobsSchema = z.object({
  queue_name: z.string().optional().describe(PARAM_DESCRIPTIONS.queue_name),
  status: z
    .enum(['scheduled', 'queued', 'running', 'succeeded', 'failed', 'discarded'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  job_class: z.string().optional().describe(PARAM_DESCRIPTIONS.job_class),
  after: z.string().optional().describe(PARAM_DESCRIPTIONS.after),
  before: z.string().optional().describe(PARAM_DESCRIPTIONS.before),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function listGoodJobs(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_good_jobs',
    description: `Retrieve a paginated list of GoodJob background jobs from the PulseMCP Admin API.

Example response:
{
  "jobs": [
    {
      "id": "abc-123",
      "job_class": "SyncMCPServersJob",
      "queue_name": "default",
      "status": "succeeded",
      "scheduled_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 150 }
}

Use cases:
- Browse background jobs to monitor system health
- Filter jobs by status to find failures
- Search for specific job classes
- Monitor queue throughput`,
    inputSchema: {
      type: 'object',
      properties: {
        queue_name: { type: 'string', description: PARAM_DESCRIPTIONS.queue_name },
        status: {
          type: 'string',
          enum: ['scheduled', 'queued', 'running', 'succeeded', 'failed', 'discarded'],
          description: PARAM_DESCRIPTIONS.status,
        },
        job_class: { type: 'string', description: PARAM_DESCRIPTIONS.job_class },
        after: { type: 'string', description: PARAM_DESCRIPTIONS.after },
        before: { type: 'string', description: PARAM_DESCRIPTIONS.before },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListGoodJobsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getGoodJobs({
          queue_name: validatedArgs.queue_name,
          status: validatedArgs.status as GoodJobStatus | undefined,
          job_class: validatedArgs.job_class,
          after: validatedArgs.after,
          before: validatedArgs.before,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        let content = `Found ${response.jobs.length} jobs`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, job] of response.jobs.entries()) {
          content += `${index + 1}. **${job.job_class}** (ID: ${job.id})\n`;
          content += `   Queue: ${job.queue_name} | Status: ${job.status}\n`;
          if (job.scheduled_at) {
            content += `   Scheduled: ${job.scheduled_at}\n`;
          }
          if (job.error) {
            content += `   Error: ${job.error}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching good jobs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
