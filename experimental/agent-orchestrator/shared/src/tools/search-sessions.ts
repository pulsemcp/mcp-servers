import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'Get a specific session by ID. When provided, other filters are ignored.',
  query:
    'Search query to find sessions. Case-insensitive substring match against session title, metadata, and custom_metadata — not a semantic search, and it does NOT reach transcript contents. Leave empty to list all sessions.',
  status:
    'Filter results by status. Options: "waiting", "running", "needs_input", "failed", "archived"',
  agent_runtime: 'Filter results by agent runtime.',
  show_archived:
    'Include archived sessions in results. Default: false — archived sessions are EXCLUDED unless you pass true. ' +
    'A session is archived when it finishes its work, so a default-filtered search is blind to exactly the sessions ' +
    'that answer "has this already been handled?". Always pass true for duplicate detection, alert-spurt checks, and ' +
    'prior-work sweeps: a null result from a default-filtered search is NOT evidence of absence. ' +
    'Note that status: "archived" returns nothing unless show_archived is also true.',
  page: 'Page number for pagination. Default: 1',
  per_page: 'Number of results per page (1-100). Default: 25',
} as const;

export const QuickSearchSessionsSchema = z.object({
  id: z.number().optional().describe(PARAM_DESCRIPTIONS.id),
  query: z.string().max(1000).optional().describe(PARAM_DESCRIPTIONS.query),
  status: z
    .enum(['waiting', 'running', 'needs_input', 'failed', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  agent_runtime: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_runtime),
  show_archived: z.boolean().optional().describe(PARAM_DESCRIPTIONS.show_archived),
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  per_page: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.per_page),
});

const TOOL_DESCRIPTION = `Quick title-based search for agent sessions in the Agent Orchestrator.

**Important:** The query is a case-insensitive substring match against session title, metadata, and custom_metadata — primarily a title search. It is NOT a semantic search, and it does NOT reach transcript contents. Use this when you roughly know the session title you're looking for.

**Use cases:**
- Find a specific session by ID (set id parameter)
- Search sessions by title keyword (set query parameter)
- List all sessions with optional status filter
- Monitor sessions that have completed or need attention (status: "needs_input")
- Check whether work was already handled — duplicate detection, alert-spurt checks, prior-work sweeps (**always set show_archived: true**)

**Archived sessions are excluded by default.** Sessions archive when they complete, so the default view is a small live-only slice of history — a search for prior work that omits \`show_archived: true\` will miss precisely the completed sessions it is looking for, and its empty result is not evidence that no such session exists.

**Returns:** A list of matching sessions with their status, configuration, and metadata.

**Session statuses:**
- waiting: Session created, waiting to start
- running: Agent is actively executing
- needs_input: Agent has completed its current work and is idle. May indicate the task is done (most common) or that the agent needs additional input to continue. Check the session transcript to determine which case applies.
- failed: Session encountered an error
- archived: Session completed and archived`;

/** Maximum characters to display for prompt preview */
const MAX_PROMPT_DISPLAY_LENGTH = 100;

/**
 * Notice rendered whenever the result was filtered to non-archived sessions.
 *
 * The REST API paginates the already-filtered scope and its `pagination` payload
 * carries no count of the archived rows it dropped, so this notice is qualitative
 * by necessity — see https://github.com/pulsemcp/pulsemcp/issues/5055.
 */
function archivedExclusionNotice(status?: string): string[] {
  const lines = [
    '> ⚠️ **Archived sessions were excluded** — `show_archived` defaults to `false`. Sessions archive when they finish their work, so this view is a live-only slice of history and can omit most of it.',
    '>',
    '> If you are checking for prior/duplicate work, re-run with `show_archived: true`. An empty or thin result here is NOT evidence that no such session exists.',
  ];

  if (status === 'archived') {
    lines.push(
      '>',
      '> You passed `status: "archived"` without `show_archived: true`. Those filters cancel each other out server-side, so this combination always returns zero sessions.'
    );
  }

  return lines;
}

function formatSession(session: Session): string {
  const lines = [
    `### ${session.title} (ID: ${session.id})`,
    '',
    `- **Status:** ${session.status}`,
    `- **Agent Runtime:** ${session.agent_runtime}`,
  ];

  if (session.slug) lines.push(`- **Slug:** ${session.slug}`);
  if (session.category) lines.push(`- **Category:** ${session.category.name}`);
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

export function quickSearchSessionsTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'quick_search_sessions',
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
        status: {
          type: 'string',
          enum: ['waiting', 'running', 'needs_input', 'failed', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
        agent_runtime: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_runtime,
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
        const validatedArgs = QuickSearchSessionsSchema.parse(args);
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
          // Use search endpoint (title/metadata substring match, no transcript content search)
          const response = await client.searchSessions(validatedArgs.query, {
            status: validatedArgs.status,
            agent_runtime: validatedArgs.agent_runtime,
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
            agent_runtime: validatedArgs.agent_runtime,
            show_archived: validatedArgs.show_archived,
            page: validatedArgs.page,
            per_page: validatedArgs.per_page,
          });
          sessions = response.sessions;
          pagination = response.pagination;
        }

        const archivedExcluded = !validatedArgs.show_archived;

        if (sessions.length === 0) {
          const emptyLines = ['No sessions found matching the specified criteria.'];
          if (archivedExcluded) {
            emptyLines.push('', ...archivedExclusionNotice(validatedArgs.status));
          }
          return {
            content: [
              {
                type: 'text',
                text: emptyLines.join('\n'),
              },
            ],
          };
        }

        const lines = [`## Agent Sessions`, ''];

        if (archivedExcluded) {
          lines.push(
            `Found ${pagination.total_count} non-archived session(s) (page ${pagination.page} of ${pagination.total_pages}), archived excluded:`,
            '',
            ...archivedExclusionNotice(validatedArgs.status),
            ''
          );
        } else {
          lines.push(
            `Found ${pagination.total_count} session(s) (page ${pagination.page} of ${pagination.total_pages}), archived included:`,
            ''
          );
        }

        sessions.forEach((session) => {
          lines.push(formatSession(session));
          lines.push('');
        });

        if (pagination.page < pagination.total_pages || archivedExcluded) {
          lines.push('---');
        }
        if (pagination.page < pagination.total_pages) {
          lines.push(
            `*More sessions available. Use page=${pagination.page + 1} to see the next page.*`
          );
        }
        if (archivedExcluded) {
          lines.push(
            '*Archived sessions were excluded from these results — re-run with `show_archived: true` to include completed work.*'
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
