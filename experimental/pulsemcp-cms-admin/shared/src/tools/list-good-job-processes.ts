import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function listGoodJobProcesses(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_good_job_processes',
    description: `Retrieve all GoodJob worker processes. Returns information about active job processing workers including their state, hostname, and queue assignments.

Example response:
{
  "processes": [
    {
      "id": "proc-123",
      "state": "running",
      "hostname": "worker-1",
      "pid": 12345,
      "queues": ["default", "mailers"],
      "max_threads": 5
    }
  ]
}

Use cases:
- Monitor active worker processes
- Check worker health and state
- Review queue assignments across workers`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const response = await client.getGoodJobProcesses();

        let content = `Found ${response.processes.length} processes:\n\n`;

        for (const [index, proc] of response.processes.entries()) {
          content += `${index + 1}. **Process ${proc.id}**\n`;
          content += `   State: ${proc.state}\n`;
          if (proc.hostname) {
            content += `   Hostname: ${proc.hostname}\n`;
          }
          if (proc.pid) {
            content += `   PID: ${proc.pid}\n`;
          }
          if (proc.queues && proc.queues.length > 0) {
            content += `   Queues: ${proc.queues.join(', ')}\n`;
          }
          if (proc.max_threads) {
            content += `   Max Threads: ${proc.max_threads}\n`;
          }
          if (proc.created_at) {
            content += `   Started: ${proc.created_at}\n`;
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
