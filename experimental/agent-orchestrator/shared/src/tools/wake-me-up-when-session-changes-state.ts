import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import { parseAllowedAgentRoots } from '../allowed-agent-roots.js';

const AO_EVENT_NAMES = ['session_needs_input', 'session_failed'] as const;
type AoEventName = (typeof AO_EVENT_NAMES)[number];

export const WakeMeUpWhenSessionChangesStateSchema = z.object({
  session_id: z.union([z.string(), z.number()]),
  watched_session_id: z.number().int().positive(),
  event_name: z.enum(AO_EVENT_NAMES),
  prompt: z.string(),
});

const TOOL_DESCRIPTION = `Schedule this session to be woken up when another session transitions to \`needs_input\` or \`failed\`. The requester session is put to sleep (waiting status) and a one-time trigger fires when the watched session enters the matching state. If the requester is manually resumed before the watched session transitions, the trigger is silently consumed and won't re-fire.

This is the **state-based analog of \`wake_me_up_later\`**. Use \`wake_me_up_later\` when you know *when* to wake up (a clock time). Use this tool when you know *what event* to wake up on but not when it will happen — e.g., a subagent session you spawned will eventually need input or might fail, and you want to be the first to handle it without polling.

**IMPORTANT — Use this tool instead of polling.** When this tool is available, it is the correct way to wait on another session's state. Do NOT use these alternatives:
- **Repeated \`get_session\` calls in a poll loop**: wastes compute, racks up tool-call overhead, and either polls too often (waste) or too rarely (latency). The trigger fires immediately on transition with no polling latency.
- **\`wake_me_up_later\` with a guessed duration**: time-based wake-ups are wrong here — you don't know when the watched session will transition, and a guess is either too short (you wake up early and have to re-sleep) or too long (the watched session has been sitting in \`needs_input\` while you sleep).

**The watched session can be ANY session**, not just one the requester spawned. You can watch a peer session, a session a different agent created, or even a session run by a different user — as long as the requester knows the watched session's id.

**One-shot semantics.** The trigger auto-disables after firing. If the watched session transitions, the requester wakes up exactly once, then the trigger is gone. To wake on the next transition too, schedule another trigger from the woken-up turn.

**Important — fires on transitions, not on current state.** The trigger fires when the watched session *moves into* the target state, not when it is *already in* it. If the watched session is already \`needs_input\` when you create the trigger, the trigger waits for the next transition out and back in (which only happens if someone resumes the watched session). For \`session_failed\` on a session that is already \`failed\`, the trigger never fires — \`failed\` is terminal. This tool rejects those terminal/no-fire-possible cases up front (already-failed watched session, archived watched session, self-watch). For non-terminal "already in target state" cases, the call succeeds but is a no-op until the watched session is resumed.

**Deadline backstop pattern.** If you need to wake on the watched session's transition *or* after a max wait time (whichever comes first), create a second \`wake_me_up_later\` trigger alongside this one. First trigger to fire wins; the AO firing path resumes the requester once and the other trigger is silently dropped.

**Parameters:**
- **session_id**: The session to wake up (the requester). Works from either \`needs_input\` or \`running\` state — if you call this tool from within your own currently-running session, the sleep transition is recorded and takes effect after the current turn ends.
- **watched_session_id**: The session to watch. Must be a positive integer. The Rails API rejects unknown ids with a clear 422.
- **event_name**: Which transition to wake on:
  - \`session_needs_input\`: watched session moves to \`needs_input\` (typically: it finished a turn and is waiting for the user, OR it asked a clarifying question)
  - \`session_failed\`: watched session moves to \`failed\` (a hard error — the session crashed or was killed)

  Pick the one that matches what you're actually waiting for. If you want to wake on either, create two triggers (one per event) — the first to fire wins, and the other is silently dropped on the requester's resume.
- **prompt**: The prompt to send when waking up the session. Include enough context that the woken-up turn knows what to do (e.g., "session #N you were watching just transitioned — check its output and decide next steps").

**What happens:**
1. Creates a one-time \`ao_event\` trigger bound to the requester (\`reuse_session: true\`, \`last_session_id: session_id\`) with a single condition scoped to \`watched_session_id\` and \`event_name\`.
2. As a side effect of creating the trigger, the AO API transitions the requester to sleeping (waiting) status — immediately if currently \`needs_input\`, or after the current turn ends if currently \`running\`.
3. When the watched session transitions to the matching state, the trigger fires and resumes the requester with the provided prompt. The trigger then auto-deletes (one-shot).
4. If the requester is manually resumed first, the pending trigger is consumed (won't fire). If the watched session is archived without ever transitioning, the trigger is cleaned up.

**You must end your conversation turn after calling this tool** so the auto-sleep can take effect. If your turn keeps running, the requester will not be in a wakeable state when the watched session transitions, and the wake-up will be silently dropped.`;

export function wakeMeUpWhenSessionChangesStateTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'wake_me_up_when_session_changes_state',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description:
            'Session ID (numeric) or slug (string) for the session to wake up (the requester). Accepts sessions in needs_input or running state — from a running session, the sleep takes effect after the current turn ends.',
        },
        watched_session_id: {
          type: 'number',
          description:
            'ID of the session to watch. Must be a positive integer. The trigger fires when this session transitions to the matching event_name state.',
        },
        event_name: {
          type: 'string',
          enum: [...AO_EVENT_NAMES],
          description:
            'Which transition to wake on: "session_needs_input" (watched session is waiting for input) or "session_failed" (watched session crashed).',
        },
        prompt: {
          type: 'string',
          description: 'The prompt to send when waking up the requester session.',
        },
      },
      required: ['session_id', 'watched_session_id', 'event_name', 'prompt'],
    },
    handler: async (args: unknown) => {
      try {
        let validated: {
          session_id: string | number;
          watched_session_id: number;
          event_name: AoEventName;
          prompt: string;
        };
        try {
          validated = WakeMeUpWhenSessionChangesStateSchema.parse(args);
        } catch (zodError) {
          // Surface a clear validation error message instead of a raw stack.
          const issues =
            zodError instanceof z.ZodError
              ? zodError.issues
                  .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
                  .join('; ')
              : zodError instanceof Error
                ? zodError.message
                : 'Unknown validation error';
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid arguments — ${issues}. No trigger was created and no session state was changed.`,
              },
            ],
            isError: true,
          };
        }

        const { session_id, watched_session_id, event_name, prompt } = validated;

        if (parseAllowedAgentRoots() !== null) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: wake_me_up_when_session_changes_state is not allowed when ALLOWED_AGENT_ROOTS is set. Triggers cannot be created because sessions are restricted to specific preconfigured agent roots.',
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();
        const session = await client.getSession(session_id);

        // The trigger fires on the requester's auto-sleep+resume cycle when the
        // watched session transitions. If they're the same session, the
        // requester would resume itself in a confusing self-loop. Guard up
        // front before any state change.
        if (typeof session.id === 'number' && session.id === watched_session_id) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: watched_session_id (${watched_session_id}) is the same as the requester session id. A session cannot watch itself for state changes — the auto-sleep would never resolve cleanly. Pass a different session id.`,
              },
            ],
            isError: true,
          };
        }

        // Reject states the Rails API can't auto-sleep from. `needs_input` →
        // immediate sleep; `running` → deferred sleep via pending_sleep metadata;
        // `waiting` → already dormant, trigger fires normally. Anything else
        // (failed, archived) would silently no-op the auto-sleep and leave the
        // caller with a trigger targeting a session that can't be woken.
        const WAKEABLE_STATUSES = ['needs_input', 'running', 'waiting'];
        if (!WAKEABLE_STATUSES.includes(session.status)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Session ${session.id} is in "${session.status}" state and cannot be scheduled for wake-up. Only sessions in ${WAKEABLE_STATUSES.join(', ')} can be woken up.`,
              },
            ],
            isError: true,
          };
        }

        // The Rails firing path (AoEventTriggerJob, fired from
        // session_state_machine transition callbacks) only fires on actual
        // *transitions* to the target state. If the watched session is already
        // in a terminal/non-transitionable state, the trigger would never fire
        // and the requester would sleep forever. Guard against the common
        // footguns up front.
        let watchedSession;
        try {
          watchedSession = await client.getSession(watched_session_id);
        } catch (lookupError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Could not look up watched session ${watched_session_id}: ${lookupError instanceof Error ? lookupError.message : 'Unknown error'}. No trigger was created and no session state was changed.`,
              },
            ],
            isError: true,
          };
        }
        if (event_name === 'session_failed' && watchedSession.status === 'failed') {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Watched session ${watched_session_id} is already in "failed" state. The trigger fires on transitions only — a session that is already failed will not transition to failed again, so the requester would sleep forever. Inspect the failed session directly instead of waiting on it.`,
              },
            ],
            isError: true,
          };
        }
        if (watchedSession.status === 'archived') {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Watched session ${watched_session_id} is archived and will not transition further. The trigger would never fire. Pass an active session id, or inspect the archived session directly.`,
              },
            ],
            isError: true,
          };
        }

        // The Rails Trigger model requires agent_root_name, but for per-session
        // wake-up triggers (reuse_session + last_session_id + one-time event)
        // the value is never used to spawn a session — the target session is
        // always reused. Prefer the canonical metadata value with agent_type as
        // a legacy fallback (matches wake_me_up_later behavior).
        const agentRootName =
          (session.metadata?.agent_root_key as string | undefined) || session.agent_type;

        let trigger;
        try {
          trigger = await client.createTrigger({
            name: `Wake session #${session.id} on ${event_name} of session #${watched_session_id}`,
            agent_root_name: agentRootName,
            prompt_template: prompt,
            reuse_session: true,
            last_session_id: session.id,
            trigger_conditions_attributes: [
              {
                condition_type: 'ao_event',
                configuration: {
                  event_name,
                  watched_session_id,
                },
              },
            ],
          });
        } catch (triggerError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Trigger creation failed: ${triggerError instanceof Error ? triggerError.message : 'Unknown error'}. The session is still in its original state — no changes were made.`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          '## Wake-Up Scheduled Successfully',
          '',
          `- **Requester Session ID:** ${session.id}`,
          `- **Watched Session ID:** ${watched_session_id}`,
          `- **Event:** ${event_name}`,
          `- **Trigger ID:** ${trigger.id}`,
          `- **Trigger Name:** ${trigger.name}`,
          '',
          '**You must end your conversation turn now.** The requester session will be automatically transitioned to waiting (immediately if currently needs_input; after the current turn ends if currently running) and resumed when the watched session transitions to the matching state.',
          '',
          '⚠️ **Warning:** If you do not end your conversation turn, the requester may still be running when the watched session transitions. A wake-up cannot be delivered to a session that is not in a wakeable (sleeping/waiting) state — it will be silently dropped, and you will never receive it.',
          '',
          '**One-shot:** the trigger auto-deletes after firing. If you want to wake on the next transition too, schedule another trigger from the woken-up turn.',
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error scheduling state-change wake-up: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
