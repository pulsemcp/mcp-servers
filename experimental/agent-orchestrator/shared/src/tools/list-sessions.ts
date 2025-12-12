import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session } from '../types.js';

const PARAM_DESCRIPTIONS = {
  status:
    'Filter sessions by status. Options: "waiting", "running", "needs_input", "failed", "archived"',
  agent_type: 'Filter sessions by agent type. Currently only "claude_code" is supported.',
  show_archived:
    'Include archived sessions in the results. Default: false. Set to true to see all sessions including archived ones.',
  page: 'Page number for pagination. Default: 1',
  per_page:
    'Number of results per page (1-100). Default: 25. Use lower values for faster responses.',
} as const;

export const ListSessionsSchema = z.object({
  status: z
    .enum(['waiting', 'running', 'needs_input', 'failed', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  agent_type: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_type),
  show_archived: z.boolean().optional().describe(PARAM_DESCRIPTIONS.show_archived),
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  per_page: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.per_page),
});

const TOOL_DESCRIPTION = `List agent sessions from the Agent Orchestrator.

**Returns:** A paginated list of sessions with their current status, configuration, and metadata.

**Use cases:**
- View all running agent sessions
- Monitor session statuses
- Find sessions by status (e.g., all "needs_input" sessions requiring attention)
- Browse recent sessions

**Session statuses:**
- waiting: Session created, waiting to start
- running: Agent is actively executing
- needs_input: Agent paused, waiting for user input
- failed: Session encountered an error
- archived: Session completed and archived`;

/** Maximum characters to display for prompt preview */
const MAX_PROMPT_DISPLAY_LENGTH = 100;

function formatSession(session: Session): string {
  const lines = [
    `### ${session.title} (ID: ${session.id})`,
    '',
    `- **Status:** ${session.status}`,
    `- **Agent Type:** ${session.agent_type}`,
  ];

  if (session.slug) lines.push(`- **Slug:** ${session.slug}`);
  if (session.git_root) lines.push(`- **Repository:** ${session.git_root}`);
  if (session.branch) lines.push(`- **Branch:** ${session.branch}`);
  if (session.prompt) {
    const truncatedPrompt =
      session.prompt.length > MAX_PROMPT_DISPLAY_LENGTH
        ? session.prompt.slice(0, MAX_PROMPT_DISPLAY_LENGTH) + '...'
        : session.prompt;
    lines.push(`- **Prompt:** ${truncatedPrompt}`);
  }
  if (session.mcp_servers && session.mcp_servers.length > 0) {
    lines.push(`- **MCP Servers:** ${session.mcp_servers.join(', ')}`);
  }
  lines.push(`- **Created:** ${session.created_at}`);
  lines.push(`- **Updated:** ${session.updated_at}`);

  return lines.join('\n');
}

export function listSessionsTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'list_sessions',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['waiting', 'running', 'needs_input', 'failed', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
        agent_type: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_type,
        },
        show_archived: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.show_archived,
        },
        page: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.page,
        },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.per_page,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListSessionsSchema.parse(args);
        const client = clientFactory();

        const response = await client.listSessions(validatedArgs);

        if (response.sessions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No sessions found matching the specified criteria.',
              },
            ],
          };
        }

        const lines = [
          `## Agent Sessions`,
          '',
          `Found ${response.pagination.total_count} session(s) (page ${response.pagination.page} of ${response.pagination.total_pages}):`,
          '',
        ];

        response.sessions.forEach((session) => {
          lines.push(formatSession(session));
          lines.push('');
        });

        if (response.pagination.page < response.pagination.total_pages) {
          lines.push('---');
          lines.push(
            `*More sessions available. Use page=${response.pagination.page + 1} to see the next page.*`
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
