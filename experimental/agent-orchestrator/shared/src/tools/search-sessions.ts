import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'Get a specific session by ID. When provided, other filters are ignored.',
  query:
    'Search query to find sessions. Searches across title, metadata, and custom_metadata. Leave empty to list all sessions.',
  search_contents:
    'Also search within transcript contents. May be slow for sessions with large transcripts. Default: false',
  status:
    'Filter results by status. Options: "waiting", "running", "needs_input", "failed", "archived"',
  agent_type: 'Filter results by agent type.',
  show_archived: 'Include archived sessions in results. Default: false',
  page: 'Page number for pagination. Default: 1',
  per_page: 'Number of results per page (1-100). Default: 25',
} as const;

export const SearchSessionsSchema = z.object({
  id: z.number().optional().describe(PARAM_DESCRIPTIONS.id),
  query: z.string().max(1000).optional().describe(PARAM_DESCRIPTIONS.query),
  search_contents: z.boolean().optional().describe(PARAM_DESCRIPTIONS.search_contents),
  status: z
    .enum(['waiting', 'running', 'needs_input', 'failed', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  agent_type: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_type),
  show_archived: z.boolean().optional().describe(PARAM_DESCRIPTIONS.show_archived),
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  per_page: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.per_page),
});

const TOOL_DESCRIPTION = `Search for agent sessions in the Agent Orchestrator.

**Use cases:**
- Find a specific session by ID (set id parameter)
- Search sessions by keyword in title/prompt (set query parameter)
- List all sessions with optional status filter
- Monitor sessions requiring attention (status: "needs_input")

**Returns:** A list of matching sessions with their status, configuration, and metadata.

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

export function searchSessionsTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'search_sessions',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
        query: {
          type: 'string',
          maxLength: 1000,
          description: PARAM_DESCRIPTIONS.query,
        },
        search_contents: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.search_contents,
        },
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
        const validatedArgs = SearchSessionsSchema.parse(args);
        const client = clientFactory();

        // If ID is provided, get that specific session
        if (validatedArgs.id !== undefined) {
          const session = await client.getSession(validatedArgs.id);
          return {
            content: [
              {
                type: 'text',
                text: `## Session Found\n\n${formatSession(session)}`,
              },
            ],
          };
        }

        // Otherwise, search or list sessions
        let sessions: Session[];
        let pagination: { page: number; total_pages: number; total_count: number };

        if (validatedArgs.query) {
          // Use search endpoint
          const response = await client.searchSessions(validatedArgs.query, {
            search_contents: validatedArgs.search_contents,
            status: validatedArgs.status,
            agent_type: validatedArgs.agent_type,
            show_archived: validatedArgs.show_archived,
            page: validatedArgs.page,
            per_page: validatedArgs.per_page,
          });
          sessions = response.sessions;
          pagination = response.pagination;
        } else {
          // Use list endpoint
          const response = await client.listSessions({
            status: validatedArgs.status,
            agent_type: validatedArgs.agent_type,
            show_archived: validatedArgs.show_archived,
            page: validatedArgs.page,
            per_page: validatedArgs.per_page,
          });
          sessions = response.sessions;
          pagination = response.pagination;
        }

        if (sessions.length === 0) {
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
          `Found ${pagination.total_count} session(s) (page ${pagination.page} of ${pagination.total_pages}):`,
          '',
        ];

        sessions.forEach((session) => {
          lines.push(formatSession(session));
          lines.push('');
        });

        if (pagination.page < pagination.total_pages) {
          lines.push('---');
          lines.push(
            `*More sessions available. Use page=${pagination.page + 1} to see the next page.*`
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
              text: `Error searching sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
