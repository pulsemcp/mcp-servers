import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  enabled:
    'true enables the one-off bypass; false disables it. When enabled, the NEXT run of UpdatePopularityEstimatesFromBigqueryJob flushes the legitimate downward corrections currently held by the SYSTEMIC_DROP guardrail (and clears their popularity_drop_held_since), then the flag auto-resets to false so the bypass never silently stays on.',
} as const;

const SetPopularityDropBypassSchema = z.object({
  enabled: z.boolean().describe(PARAM_DESCRIPTIONS.enabled),
});

export function setPopularityDropBypass(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'set_popularity_drop_bypass',
    description: `Enable or disable a deliberate, auditable ONE-OFF bypass of the SYSTEMIC_DROP guardrail in the popularity-estimates pipeline.

Background: UpdatePopularityEstimatesFromBigqueryJob holds large downward popularity corrections when more than ~10% of servers would drop at once (a possible systemic upstream event), keeping each flagged server at its stale value for ~3 days. During a known-legitimate remediation wave (e.g. correcting servers mis-linked to famous registry packages), that guardrail keeps genuinely-corrected servers visible at inflated values.

Enabling this bypass tells the NEXT job run to skip the SYSTEMIC_DROP hold for that single run only: it applies the corrected (dropped) BigQuery values, clears popularity_drop_held_since for the affected servers, then CONSUMES the flag (auto-resets enabled→false). The independent impossible-RISE guardrail is unaffected.

Returns the resulting bypass status (enabled / enabled_at / enabled_by).

Use cases:
- Enable the bypass before the next scheduled run to flush a known-legitimate correction wave caught in a systemic hold
- Disable the bypass if it was enabled in error and the next run has not yet consumed it`,
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: PARAM_DESCRIPTIONS.enabled },
      },
      required: ['enabled'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetPopularityDropBypassSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.setPopularityDropBypass(validatedArgs.enabled);

        const text = `Popularity drop bypass ${result.enabled ? 'ENABLED' : 'DISABLED'}.
- enabled: ${result.enabled}
- enabled_at: ${result.enabled_at ?? '(none)'}
- enabled_by: ${result.enabled_by ?? '(none)'}${
          result.enabled
            ? '\n\nThe next UpdatePopularityEstimatesFromBigqueryJob run will flush held drops and then auto-reset this flag.'
            : ''
        }`;

        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting popularity drop bypass: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
