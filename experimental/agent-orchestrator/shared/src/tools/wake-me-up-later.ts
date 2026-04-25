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

// Reject wake-ups that resolve to ≤30 seconds in the future. Anything inside
// this window is effectively "now" given network latency between this tool
// call and the trigger being scheduled — and the past-dated case (the bug
// this guards against) silently fires-and-drops, leaving the session
// permanently asleep.
const WAKE_AT_GRACE_WINDOW_MS = 30 * 1000;

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const filled: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') filled[part.type] = part.value;
  }
  // hour12: false can emit "24" at midnight in some locales — normalize.
  const hour = parseInt(filled.hour, 10) % 24;
  const asIfUtc = Date.UTC(
    parseInt(filled.year, 10),
    parseInt(filled.month, 10) - 1,
    parseInt(filled.day, 10),
    hour,
    parseInt(filled.minute, 10),
    parseInt(filled.second, 10)
  );
  // Sub-second precision is dropped by Date.UTC, so the offset can be off by
  // up to ~1s when the input has fractional seconds. That's well inside the
  // 30s grace window, so it doesn't affect validation.
  return asIfUtc - date.getTime();
}

// Reject inputs that don't look like a calendar+time: bare dates ("2026-04-15"),
// trailing offsets ("...+05:00"), and `Z` paired with a non-UTC IANA timezone
// (ambiguous — we'd have to pick one to honor and the other to ignore).
const NAIVE_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/;
const EXPLICIT_OFFSET_REGEX = /[+-]\d{2}:?\d{2}$/;

// Convert a naive ISO-8601 wall-clock string in `timezone` to a UTC epoch ms.
// Iterates twice so DST-boundary inputs converge on the correct offset.
export function parseWakeAtToUtcMs(wakeAt: string, timezone: string): number {
  if (EXPLICIT_OFFSET_REGEX.test(wakeAt)) {
    throw new Error(
      `wake_at must not include a UTC offset (e.g., "+05:00"); pass the wall-clock time and an IANA timezone name (e.g., "America/New_York")`
    );
  }
  if (!NAIVE_DATETIME_REGEX.test(wakeAt)) {
    throw new Error(
      `wake_at must be an ISO-8601 datetime like "2026-04-15T14:30:00" (date-only and other formats are not accepted)`
    );
  }
  const hasZ = wakeAt.endsWith('Z');
  const isUtc = timezone === 'UTC' || timezone === 'Etc/UTC';
  if (hasZ && !isUtc) {
    throw new Error(
      `wake_at ends with "Z" (UTC) but timezone is "${timezone}". Either drop the trailing "Z" or set timezone to "UTC"`
    );
  }
  const naive = hasZ ? wakeAt.slice(0, -1) : wakeAt;
  const naiveAsUtc = new Date(naive + 'Z').getTime();
  if (Number.isNaN(naiveAsUtc)) {
    throw new Error(`Invalid wake_at value: "${wakeAt}"`);
  }
  if (isUtc) {
    return naiveAsUtc;
  }
  let utcGuess = naiveAsUtc - getTimezoneOffsetMs(new Date(naiveAsUtc), timezone);
  utcGuess = naiveAsUtc - getTimezoneOffsetMs(new Date(utcGuess), timezone);
  return utcGuess;
}

function formatUtcInstant(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildToolDescription(): string {
  const now = new Date();
  const utcNow = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  return `Schedule this session to be woken up at a specific time. The session will be put to sleep (waiting status) and a one-time trigger will fire at the specified time to resume it with the given prompt. If the session is manually resumed before the scheduled time, the trigger will be silently dropped.

**IMPORTANT — Use this tool instead of workarounds.** When this tool is available, it is the correct way to schedule a delayed wake-up in an Agent Orchestrator context. Do NOT use these alternatives:
- **Bash \`sleep\`**: Blocks the process and wastes compute resources for the entire sleep duration. The session remains "running" and cannot be reclaimed.
- **Claude Code \`ScheduleWakeup\` tool**: Does not integrate with AO's session lifecycle — it won't transition the session to sleeping/waiting state or create an AO trigger, so AO cannot track or manage the wake-up.
- **Claude Code \`Monitor\` tool**: Same problem — it operates outside AO's session state management.

This tool creates a one-time AO wake-up trigger bound to the target session. The AO API atomically transitions the session to sleeping (waiting) state as part of creating the trigger, so AO can reclaim resources and the trigger is guaranteed to resume the correct session at the specified time.

**Current server time:** ${utcNow} (UTC). Use this as your reference point when calculating wake-up times.

**Timezone handling:**
- The \`wake_at\` parameter is interpreted in the timezone specified by \`timezone\` (default: "UTC").
- To schedule "30 minutes from now": take the current UTC time above, add 30 minutes, and pass that as \`wake_at\` with timezone "UTC" (or omit timezone).
- To schedule at a wall-clock time in a specific timezone (e.g., "9am Eastern"): pass \`wake_at\` as "2026-04-15T09:00:00" with timezone "America/New_York". The server converts to UTC internally.
- Use IANA timezone names (e.g., "America/New_York", "Europe/London", "Asia/Tokyo"). Do NOT pass UTC offsets like "+05:00" in the timezone parameter.
- If you omit timezone, wake_at is treated as UTC.

**Choosing wake_at — adaptive scheduling for unknown durations:**
When monitoring downstream work whose duration you can't predict (e.g., a subagent or pipeline phase), the bias is **prefer over-polling to under-polling**. A too-frequent poll wastes a few seconds of compute; a too-long sleep wastes minutes of user-facing wall-clock time and erodes trust. When in doubt, go shorter.

**Rules:**
- **First wake: MUST be ≤5 minutes from now.** Use less if you have any reason to think the work could already be done (e.g., a 30-second task — pick 1–2 minutes). This is a hard cap, not a default. Do NOT pick a longer first wake just because the work "might take a while" — you have not observed anything yet, so you cannot know.
- **Second and later wakes:** Now that you've actually observed progress, you may scale the next wake to what you saw:
  - If the work is nearly done (~80%+): a few more minutes.
  - In between: proportional to remaining work, capped at ~15 minutes.
  - If barely started (<20%) AND you have already polled at least twice and confirmed the work is genuinely long-running: you may extend up to ~30 minutes. Do NOT use this tier on the first or second poll.
- **Never** pick a wake interval ≥10× the expected total task duration. If a downstream task should take ~3 minutes, a 25-minute wake is wrong even on the first poll — pick 2–3 minutes instead.

This guidance does NOT apply when waking at a known wall-clock time (e.g., "9am tomorrow") — use the calculated time directly.

**Parameters:**
- **session_id**: The session to wake up. Works from either \`needs_input\` or \`running\` state — if you call this tool from within your own currently-running session, the sleep transition is recorded and takes effect after the current turn ends.
- **wake_at**: ISO 8601 datetime without offset for when to wake up (e.g., "2026-04-15T14:30:00")
- **timezone**: IANA timezone for interpreting wake_at (default: "UTC", e.g., "America/New_York")
- **prompt**: The prompt to send when waking up the session

**What happens:**
1. Creates a one-time schedule trigger bound to this session that fires at the specified time.
2. As a side effect of creating the trigger, the AO API transitions the session to sleeping (waiting) status — immediately if currently \`needs_input\`, or after the current turn ends if currently \`running\`.
3. At the scheduled time, the trigger resumes the session with the provided prompt.`;
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
          description:
            'Session ID (numeric) or slug (string). Accepts sessions in needs_input or running state — from a running session, the sleep takes effect after the current turn ends.',
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
        const { session_id, wake_at, prompt } = validated;
        const timezone = validated.timezone || 'UTC';

        // Cheapest validation runs first (no DB/API calls). Past-dated
        // wake_at values silently fire-and-drop in the scheduler and leave
        // the session permanently asleep, so reject up front before any
        // state change.
        let wakeAtUtcMs: number;
        try {
          wakeAtUtcMs = parseWakeAtToUtcMs(wake_at, timezone);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Could not parse wake_at "${wake_at}" with timezone "${timezone}": ${parseError instanceof Error ? parseError.message : 'Unknown error'}. No trigger was created and no session state was changed.`,
              },
            ],
            isError: true,
          };
        }

        const nowMs = Date.now();
        if (wakeAtUtcMs - nowMs <= WAKE_AT_GRACE_WINDOW_MS) {
          const wakeAtUtcStr = formatUtcInstant(wakeAtUtcMs);
          const nowUtcStr = formatUtcInstant(nowMs);
          return {
            content: [
              {
                type: 'text',
                text: `Error: wake_at "${wake_at}" (timezone: ${timezone}) resolves to ${wakeAtUtcStr} UTC, which is in the past or within 30 seconds of the current server time (${nowUtcStr} UTC). No trigger was created and no session state was changed. Recompute relative to the current server time shown in the tool description and call again — wake_at must be more than 30 seconds in the future.`,
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();

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

        // The Rails Trigger model requires agent_root_name, but for per-session
        // wake-up triggers (reuse_session + last_session_id + one-time schedule)
        // the value is never used to spawn a session — the target session is
        // always reused. Prefer the canonical metadata value. The agent_type
        // fallback is a best-effort for pre-migration sessions without an
        // agent_root_key; if agent_type isn't a registered agent root, the
        // createTrigger call will fail loudly with a 422 rather than proceed
        // with a bad value — which is what we want.
        const agentRootName =
          (session.metadata?.agent_root_key as string | undefined) || session.agent_type;

        let trigger;
        try {
          trigger = await client.createTrigger({
            name: `Wake session #${session.id} at ${wake_at}`,
            agent_root_name: agentRootName,
            prompt_template: prompt,
            reuse_session: true,
            last_session_id: session.id,
            trigger_conditions_attributes: [
              {
                condition_type: 'schedule',
                configuration: {
                  scheduled_at: wake_at,
                  timezone,
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
          `- **Session ID:** ${session.id}`,
          `- **Wake At:** ${wake_at} (${timezone})`,
          `- **Trigger ID:** ${trigger.id}`,
          `- **Trigger Name:** ${trigger.name}`,
          '',
          '**You must end your conversation turn now.** The session will be automatically transitioned to waiting (immediately if currently needs_input; after the current turn ends if currently running) and resumed at the scheduled time with the provided prompt.',
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
