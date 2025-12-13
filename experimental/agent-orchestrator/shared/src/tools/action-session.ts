import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) to perform the action on.',
  action:
    'Action to perform: "follow_up" (send prompt to paused session), "pause" (pause running session), "restart" (restart paused/failed session), "archive" (archive session), "unarchive" (restore archived session)',
  prompt:
    'Required for "follow_up" action. The prompt to send to the agent. Not used for other actions.',
} as const;

const ACTION_ENUM = ['follow_up', 'pause', 'restart', 'archive', 'unarchive'] as const;

export const ActionSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(PARAM_DESCRIPTIONS.session_id),
  action: z.enum(ACTION_ENUM).describe(PARAM_DESCRIPTIONS.action),
  prompt: z.string().optional().describe(PARAM_DESCRIPTIONS.prompt),
});

const TOOL_DESCRIPTION = `Perform an action on an agent session.

**Actions:**
- **follow_up**: Send a follow-up prompt to a paused session (requires "prompt" parameter)
- **pause**: Pause a running session, transitioning it to "needs_input" status
- **restart**: Restart a paused or failed session without providing new input
- **archive**: Archive a session (marks as completed)
- **unarchive**: Restore an archived session to "needs_input" status

**Status requirements:**
- follow_up: Session must be "needs_input"
- pause: Session must be "running"
- restart: Session must be "needs_input" or "failed"
- archive: Session can be in any status except "archived"
- unarchive: Session must be "archived"

**Use cases:**
- Provide additional instructions to an agent
- Control session lifecycle (pause, restart)
- Organize sessions (archive, unarchive)`;

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
      },
      required: ['session_id', 'action'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ActionSessionSchema.parse(args);
        const client = clientFactory();
        const { session_id, action, prompt } = validatedArgs;

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

        let result: string;

        switch (action) {
          case 'follow_up': {
            const response = await client.followUp(session_id, prompt!);
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
            const response = await client.pauseSession(session_id);
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
            const response = await client.restartSession(session_id);
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
            const session = await client.archiveSession(session_id);
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
            const session = await client.unarchiveSession(session_id);
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
