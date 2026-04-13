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

function buildToolDescription(): string {
  const now = new Date();
  const utcNow = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  return `Schedule this session to be woken up at a specific time. The session will be put to sleep (waiting status) and a one-time trigger will fire at the specified time to resume it with the given prompt. If the session is manually resumed before the scheduled time, the trigger will be silently dropped.

**IMPORTANT — Use this tool instead of workarounds.** When this tool is available, it is the correct way to schedule a delayed wake-up in an Agent Orchestrator context. Do NOT use these alternatives:
- **Bash \`sleep\`**: Blocks the process and wastes compute resources for the entire sleep duration. The session remains "running" and cannot be reclaimed.
- **Claude Code \`ScheduleWakeup\` tool**: Does not integrate with AO's session lifecycle — it won't transition the session to sleeping/waiting state or create an AO trigger, so AO cannot track or manage the wake-up.
- **Claude Code \`Monitor\` tool**: Same problem — it operates outside AO's session state management.

This tool does both: it properly transitions the session to sleeping (waiting) state so AO can reclaim resources, AND creates a one-time AO trigger to resume the session at the specified time.

**Current server time:** ${utcNow} (UTC). Use this as your reference point when calculating wake-up times.

**Timezone handling:**
- The \`wake_at\` parameter is interpreted in the timezone specified by \`timezone\` (default: "UTC").
- To schedule "30 minutes from now": take the current UTC time above, add 30 minutes, and pass that as \`wake_at\` with timezone "UTC" (or omit timezone).
- To schedule at a wall-clock time in a specific timezone (e.g., "9am Eastern"): pass \`wake_at\` as "2026-04-15T09:00:00" with timezone "America/New_York". The server converts to UTC internally.
- Use IANA timezone names (e.g., "America/New_York", "Europe/London", "Asia/Tokyo"). Do NOT pass UTC offsets like "+05:00" in the timezone parameter.
- If you omit timezone, wake_at is treated as UTC.

**Parameters:**
- **session_id**: The session to wake up (must be in needs_input state)
- **wake_at**: ISO 8601 datetime without offset for when to wake up (e.g., "2026-04-15T14:30:00")
- **timezone**: IANA timezone for interpreting wake_at (default: "UTC", e.g., "America/New_York")
- **prompt**: The prompt to send when waking up the session

**What happens:**
1. Validates the session is in needs_input state
2. Puts the session to sleep (waiting status)
3. Creates a one-time schedule trigger that fires at the specified time
4. The trigger resumes the session with the provided prompt`;
}

export function wakeMeUpLaterTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'wake_me_up_later',
    description: buildToolDescription(),
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
          '## Wake-Up Scheduled Successfully',
          '',
          `- **Session ID:** ${sleepingSession.id}`,
          `- **Session Status:** ${sleepingSession.status}`,
          `- **Wake At:** ${wake_at} (${timezone})`,
          `- **Trigger ID:** ${trigger.id}`,
          `- **Trigger Name:** ${trigger.name}`,
          '',
          '**You must end your conversation turn now.** The session is sleeping and will be automatically resumed at the scheduled time with the provided prompt.',
          '',
          '⚠️ **Warning:** If you do not end your conversation turn, the session may still be running when the scheduled wake-up fires. A wake-up cannot be delivered to a session that is not in a wakeable (sleeping/waiting) state — it will be silently dropped, and you will never receive it.',
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
