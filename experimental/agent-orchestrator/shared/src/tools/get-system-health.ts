import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

export const GetSystemHealthSchema = z.object({
  include_cli_status: z.boolean().optional(),
});

const TOOL_DESCRIPTION = `Get the system health report for the Agent Orchestrator.

Returns system health information including session counts, job queue status, and system metrics.
Optionally include CLI tool installation status.

**Use cases:**
- Monitor system health and performance
- Check for stuck sessions or failed jobs
- Verify CLI tools are properly installed`;

export function getSystemHealthTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'get_system_health',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        include_cli_status: {
          type: 'boolean',
          description: 'Include CLI tool installation status. Default: false',
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetSystemHealthSchema.parse(args);
        const client = clientFactory();

        const health = await client.getHealth();
        const lines = [
          '## System Health Report',
          '',
          `- **Timestamp:** ${health.timestamp}`,
          `- **Environment:** ${health.rails_env}`,
          `- **Ruby Version:** ${health.ruby_version}`,
          '',
          '### Health Details',
          '```json',
          JSON.stringify(health.health_report, null, 2),
          '```',
        ];

        if (validated.include_cli_status) {
          try {
            const cliStatus = await client.getCliStatus();
            lines.push(
              '',
              '### CLI Status',
              `- **Unauthenticated CLIs:** ${cliStatus.unauthenticated_count}`,
              '',
              '```json',
              JSON.stringify(cliStatus.cli_status, null, 2),
              '```'
            );
          } catch (error) {
            lines.push(
              '',
              `*Could not fetch CLI status: ${error instanceof Error ? error.message : 'Unknown error'}*`
            );
          }
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting system health: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
