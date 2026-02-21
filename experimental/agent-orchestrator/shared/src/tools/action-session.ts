import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const PARAM_DESCRIPTIONS = {
  session_id:
    'Session ID (numeric) or slug (string). Required for most actions. Not required for "refresh_all" and "bulk_archive".',
  action:
    'Action to perform: "follow_up", "pause", "restart", "archive", "unarchive", "change_mcp_servers", "fork", "refresh", "refresh_all", "update_notes", "toggle_favorite", "bulk_archive"',
  prompt:
    'Required for "follow_up" action. The prompt to send to the agent. Not used for other actions.',
  mcp_servers:
    'Required for "change_mcp_servers" action. Array of MCP server names to set for the session.',
  message_index: 'Required for "fork" action. The transcript message index to fork from.',
  session_notes: 'Required for "update_notes" action. The notes text to set on the session.',
  session_ids: 'Required for "bulk_archive" action. Array of session IDs to archive.',
} as const;

const ACTION_ENUM = [
  'follow_up',
  'pause',
  'restart',
  'archive',
  'unarchive',
  'change_mcp_servers',
  'fork',
  'refresh',
  'refresh_all',
  'update_notes',
  'toggle_favorite',
  'bulk_archive',
] as const;

export const ActionSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).optional().describe(PARAM_DESCRIPTIONS.session_id),
  action: z.enum(ACTION_ENUM).describe(PARAM_DESCRIPTIONS.action),
  prompt: z.string().optional().describe(PARAM_DESCRIPTIONS.prompt),
  mcp_servers: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.mcp_servers),
  message_index: z.number().optional().describe(PARAM_DESCRIPTIONS.message_index),
  session_notes: z.string().optional().describe(PARAM_DESCRIPTIONS.session_notes),
  session_ids: z.array(z.number()).optional().describe(PARAM_DESCRIPTIONS.session_ids),
});

const TOOL_DESCRIPTION = `Perform an action on an agent session.

**Actions:**
- **follow_up**: Send a follow-up prompt to a paused session (requires "prompt" parameter)
- **pause**: Pause a running session, transitioning it to "needs_input" status
- **restart**: Restart a paused or failed session without providing new input
- **archive**: Archive a session (marks as completed)
- **unarchive**: Restore an archived session to "needs_input" status
- **change_mcp_servers**: Update the MCP servers for a session (requires "mcp_servers" parameter)
- **fork**: Fork a session from a specific transcript message (requires "message_index")
- **refresh**: Refresh a single session's status from the execution provider
- **refresh_all**: Refresh all active sessions (no session_id needed)
- **update_notes**: Update the notes on a session (requires "session_notes")
- **toggle_favorite**: Toggle favorite status on a session
- **bulk_archive**: Archive multiple sessions at once (requires "session_ids", no session_id needed)

**Use cases:**
- Provide additional instructions to an agent
- Control session lifecycle (pause, restart, fork, refresh)
- Organize sessions (archive, unarchive, bulk_archive, toggle_favorite, update_notes)
- Reconfigure session MCP server access`;

export function actionSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'action_session',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: PARAM_DESCRIPTIONS.session_id,
        },
        action: {
          type: 'string',
          enum: ACTION_ENUM,
          description: PARAM_DESCRIPTIONS.action,
        },
        prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prompt,
        },
        mcp_servers: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.mcp_servers,
        },
        message_index: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.message_index,
        },
        session_notes: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.session_notes,
        },
        session_ids: {
          type: 'array',
          items: { type: 'number' },
          description: PARAM_DESCRIPTIONS.session_ids,
        },
      },
      required: ['action'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ActionSessionSchema.parse(args);
        const client = clientFactory();
        const {
          session_id,
          action,
          prompt,
          mcp_servers,
          message_index,
          session_notes,
          session_ids,
        } = validatedArgs;

        // Actions that require session_id
        const requiresSessionId = [
          'follow_up',
          'pause',
          'restart',
          'archive',
          'unarchive',
          'change_mcp_servers',
          'fork',
          'refresh',
          'update_notes',
          'toggle_favorite',
        ];
        if (requiresSessionId.includes(action) && !session_id) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: The "session_id" parameter is required for the "${action}" action.`,
              },
            ],
            isError: true,
          };
        }

        // Validate that prompt is provided for follow_up action
        if (action === 'follow_up' && !prompt) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: The "prompt" parameter is required for the "follow_up" action.',
              },
            ],
            isError: true,
          };
        }

        // Validate that mcp_servers is provided for change_mcp_servers action
        if (action === 'change_mcp_servers' && !mcp_servers) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: The "mcp_servers" parameter is required for the "change_mcp_servers" action.',
              },
            ],
            isError: true,
          };
        }

        // Validate fork requires message_index
        if (action === 'fork' && message_index === undefined) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: The "message_index" parameter is required for the "fork" action.',
              },
            ],
            isError: true,
          };
        }

        // Validate update_notes requires session_notes
        if (action === 'update_notes' && session_notes === undefined) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: The "session_notes" parameter is required for the "update_notes" action.',
              },
            ],
            isError: true,
          };
        }

        // Validate bulk_archive requires session_ids
        if (action === 'bulk_archive' && (!session_ids || session_ids.length === 0)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: The "session_ids" parameter is required for the "bulk_archive" action.',
              },
            ],
            isError: true,
          };
        }

        let result: string;

        switch (action) {
          case 'follow_up': {
            const response = await client.followUp(session_id!, prompt!);
            const lines = [
              `## Follow-up Sent`,
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Title:** ${response.session.title}`,
              `- **New Status:** ${response.session.status}`,
            ];
            if (response.message) {
              lines.push(`- **Message:** ${response.message}`);
            }
            if (response.session.running_job_id) {
              lines.push(`- **Job ID:** ${response.session.running_job_id}`);
            }
            result = lines.join('\n');
            break;
          }

          case 'pause': {
            const response = await client.pauseSession(session_id!);
            const lines = [
              `## Session Paused`,
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Title:** ${response.session.title}`,
              `- **New Status:** ${response.session.status}`,
            ];
            if (response.message) {
              lines.push(`- **Message:** ${response.message}`);
            }
            result = lines.join('\n');
            break;
          }

          case 'restart': {
            const response = await client.restartSession(session_id!);
            const lines = [
              `## Session Restarted`,
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Title:** ${response.session.title}`,
              `- **New Status:** ${response.session.status}`,
            ];
            if (response.message) {
              lines.push(`- **Message:** ${response.message}`);
            }
            if (response.session.running_job_id) {
              lines.push(`- **Job ID:** ${response.session.running_job_id}`);
            }
            result = lines.join('\n');
            break;
          }

          case 'archive': {
            const session = await client.archiveSession(session_id!);
            const lines = [
              `## Session Archived`,
              '',
              `- **Session ID:** ${session.id}`,
              `- **Title:** ${session.title}`,
              `- **New Status:** ${session.status}`,
              `- **Archived At:** ${session.archived_at}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'unarchive': {
            const session = await client.unarchiveSession(session_id!);
            const lines = [
              `## Session Unarchived`,
              '',
              `- **Session ID:** ${session.id}`,
              `- **Title:** ${session.title}`,
              `- **New Status:** ${session.status}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'change_mcp_servers': {
            const session = await client.changeMcpServers(session_id!, mcp_servers!);
            const lines = [
              `## MCP Servers Updated`,
              '',
              `- **Session ID:** ${session.id}`,
              `- **Title:** ${session.title}`,
              `- **MCP Servers:** ${session.mcp_servers.length > 0 ? session.mcp_servers.join(', ') : '(none)'}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'fork': {
            const response = await client.forkSession(session_id!, message_index!);
            const lines = [
              `## Session Forked`,
              '',
              `- **New Session ID:** ${response.session.id}`,
              `- **Title:** ${response.session.title}`,
              `- **Status:** ${response.session.status}`,
              `- **Message:** ${response.message}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'refresh': {
            const response = await client.refreshSession(session_id!);
            const lines = [
              `## Session Refreshed`,
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Title:** ${response.session.title}`,
              `- **Status:** ${response.session.status}`,
              `- **Message:** ${response.message}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'refresh_all': {
            const response = await client.refreshAllSessions();
            const lines = [
              `## All Sessions Refreshed`,
              '',
              `- **Message:** ${response.message}`,
              `- **Refreshed:** ${response.refreshed}`,
              `- **Restarted:** ${response.restarted}`,
              `- **Continued:** ${response.continued}`,
              `- **Errors:** ${response.errors}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'update_notes': {
            const session = await client.updateSessionNotes(session_id!, session_notes!);
            const lines = [
              `## Session Notes Updated`,
              '',
              `- **Session ID:** ${session.id}`,
              `- **Title:** ${session.title}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'toggle_favorite': {
            const session = await client.toggleFavorite(session_id!);
            const lines = [
              `## Favorite Toggled`,
              '',
              `- **Session ID:** ${session.id}`,
              `- **Title:** ${session.title}`,
              `- **Favorited:** ${session.favorited ? 'Yes' : 'No'}`,
            ];
            result = lines.join('\n');
            break;
          }

          case 'bulk_archive': {
            const response = await client.bulkArchiveSessions(session_ids!);
            const lines = [
              `## Bulk Archive Complete`,
              '',
              `- **Archived:** ${response.archived_count}`,
            ];
            if (response.errors.length > 0) {
              lines.push(`- **Errors:** ${response.errors.length}`);
              response.errors.forEach((err) => {
                lines.push(`  - Session ${err.id}: ${err.error}`);
              });
            }
            result = lines.join('\n');
            break;
          }

          default: {
            // This should never happen due to Zod validation
            const _exhaustiveCheck: never = action;
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Unknown action "${_exhaustiveCheck}"`,
                },
              ],
              isError: true,
            };
          }
        }

        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error performing action: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
