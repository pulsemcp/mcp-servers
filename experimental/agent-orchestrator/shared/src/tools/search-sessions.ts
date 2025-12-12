import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session } from '../types.js';

const PARAM_DESCRIPTIONS = {
  query:
    'Search query to find sessions. Searches across title, metadata, and custom_metadata. Max 1000 characters.',
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
  query: z.string().min(1).max(1000).describe(PARAM_DESCRIPTIONS.query),
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

const TOOL_DESCRIPTION = `Search for sessions by query string.

**Searches:** Session title, metadata, and custom_metadata fields. Optionally searches transcript contents.

**Returns:** A paginated list of matching sessions.

**Use cases:**
- Find sessions related to a specific feature or bug
- Search for sessions by ticket ID in custom_metadata
- Locate sessions working on specific files or topics

**Performance note:** Enabling search_contents may be slow for sessions with large transcripts.`;

function formatSession(session: Session): string {
  const lines = [`### ${session.title} (ID: ${session.id})`, '', `- **Status:** ${session.status}`];

  if (session.slug) lines.push(`- **Slug:** ${session.slug}`);
  if (session.git_root) lines.push(`- **Repository:** ${session.git_root}`);
  if (session.branch) lines.push(`- **Branch:** ${session.branch}`);
  lines.push(`- **Created:** ${session.created_at}`);

  return lines.join('\n');
}

export function searchSessionsTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'search_sessions',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          minLength: 1,
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
      required: ['query'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = SearchSessionsSchema.parse(args);
        const client = clientFactory();

        const { query, ...options } = validatedArgs;
        const response = await client.searchSessions(query, options);

        if (response.sessions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No sessions found matching "${query}"${response.search_contents ? ' (including transcript contents)' : ''}.`,
              },
            ],
          };
        }

        const lines = [
          `## Search Results for "${query}"`,
          '',
          response.search_contents
            ? '*(Searched title, metadata, and transcript contents)*'
            : '*(Searched title and metadata)*',
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
            `*More results available. Use page=${response.pagination.page + 1} to see the next page.*`
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
