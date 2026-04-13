import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import { parseAllowedAgentRoots } from '../allowed-agent-roots.js';

export const WakeMeUpLaterSchema = z.object({
  session_id: z.union([z.string(), z.number()]),
  wake_at: z.string(),
  timezone: z.string().optional(),
  prompt: z.string(),
});

const TOOL_DESCRIPTION = `Schedule this session to be woken up at a specific time. The session will be put to sleep (waiting status) and a one-time trigger will fire at the specified time to resume it with the given prompt. If the session is manually resumed before the scheduled time, the trigger will be silently dropped.

**Parameters:**
- **session_id**: The session to wake up (must be in needs_input state)
- **wake_at**: ISO 8601 datetime for when to wake up (e.g., "2026-04-15T14:30:00")
- **timezone**: Timezone for the wake_at datetime (default: "UTC", e.g., "America/New_York")
- **prompt**: The prompt to send when waking up the session

**What happens:**
1. Validates the session is in needs_input state
2. Puts the session to sleep (waiting status)
3. Creates a one-time schedule trigger that fires at the specified time
4. The trigger resumes the session with the provided prompt`;

export function wakeMeUpLaterTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'wake_me_up_later',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: 'Session ID (numeric) or slug (string). Must be in needs_input state.',
        },
        wake_at: {
          type: 'string',
          description: 'ISO 8601 datetime for when to wake up (e.g., "2026-04-15T14:30:00").',
        },
        timezone: {
          type: 'string',
          description: 'Timezone for the wake_at datetime. Default: "UTC".',
        },
        prompt: {
          type: 'string',
          description: 'The prompt to send when waking up the session.',
        },
      },
      required: ['session_id', 'wake_at', 'prompt'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = WakeMeUpLaterSchema.parse(args);
        const client = clientFactory();
        const { session_id, wake_at, prompt } = validated;
        const timezone = validated.timezone || 'UTC';

        if (parseAllowedAgentRoots() !== null) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: wake_me_up_later is not allowed when ALLOWED_AGENT_ROOTS is set. Triggers cannot be created because sessions are restricted to specific preconfigured agent roots.',
              },
            ],
            isError: true,
          };
        }

        const session = await client.getSession(session_id);

        if (session.status !== 'needs_input') {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Session must be in "needs_input" state to sleep (current: "${session.status}"). Only idle sessions can be scheduled for a delayed wake-up.`,
              },
            ],
            isError: true,
          };
        }

        const sleepingSession = await client.sleepSession(session_id);

        let trigger;
        try {
          trigger = await client.createTrigger({
            name: `Wake session #${sleepingSession.id} at ${wake_at}`,
            trigger_type: 'schedule',
            agent_root_name: session.agent_type,
            prompt_template: prompt,
            reuse_session: true,
            configuration: {
              scheduled_at: wake_at,
              timezone,
            },
          });
        } catch (triggerError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Session ${sleepingSession.id} was put to sleep (waiting status) but trigger creation failed: ${triggerError instanceof Error ? triggerError.message : 'Unknown error'}. The session is now in "waiting" state and needs manual intervention (use action_session with "restart" or "follow_up" to recover).`,
              },
            ],
            isError: true,
          };
        }

        await client.updateSession(session_id, {
          custom_metadata: {
            ...session.custom_metadata,
            wake_trigger_id: trigger.id,
          },
        });

        const lines = [
          '## Session Scheduled for Wake-Up',
          '',
          `- **Session ID:** ${sleepingSession.id}`,
          `- **Session Status:** ${sleepingSession.status}`,
          `- **Wake At:** ${wake_at} (${timezone})`,
          `- **Trigger ID:** ${trigger.id}`,
          `- **Trigger Name:** ${trigger.name}`,
          '',
          'The session is now sleeping. It will be automatically resumed at the scheduled time with the provided prompt.',
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error scheduling wake-up: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
