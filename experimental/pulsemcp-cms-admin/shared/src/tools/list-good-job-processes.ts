import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function listGoodJobProcesses(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_good_job_processes',
    description: `Retrieve a list of all active GoodJob worker processes. Returns information about running worker processes including hostname, PID, and queue assignments.

Example response:
[
  {
    "id": "proc-123",
    "hostname": "worker-1.example.com",
    "pid": 12345,
    "queues": ["default", "mailers"],
    "max_threads": 5,
    "started_at": "2024-01-15T08:00:00Z"
  }
]

Use cases:
- Monitor active worker processes
- Check worker health and uptime
- Verify queue assignments across workers`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const processes = await client.getGoodJobProcesses();

        let content = `Found ${processes.length} active processes:\n\n`;

        for (const [index, proc] of processes.entries()) {
          content += `${index + 1}. **${proc.hostname}** (PID: ${proc.pid}, ID: ${proc.id})\n`;
          if (proc.queues && proc.queues.length > 0) {
            content += `   Queues: ${proc.queues.join(', ')}\n`;
          }
          if (proc.max_threads) {
            content += `   Max Threads: ${proc.max_threads}\n`;
          }
          if (proc.started_at) {
            content += `   Started: ${proc.started_at}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching processes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
