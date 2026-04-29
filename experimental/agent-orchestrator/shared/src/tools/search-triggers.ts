import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Trigger, TriggerCondition } from '../types.js';

const TRIGGER_TYPE_VALUES = ['slack', 'schedule', 'ao_event'] as const;

export const SearchTriggersSchema = z.object({
  id: z.number().optional(),
  trigger_type: z.enum(TRIGGER_TYPE_VALUES).optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
  include_channels: z.boolean().optional(),
  page: z.number().min(1).optional(),
  per_page: z.number().min(1).max(100).optional(),
});

const TOOL_DESCRIPTION = `Search and list automation triggers.

**Modes:**
- **Get by ID**: Provide an id to get trigger details with recent sessions
- **List**: List triggers with optional filters (trigger_type, status, pagination)
- **Include channels**: Set include_channels=true to also list available Slack channels (useful when creating Slack triggers)

**Filterable trigger types:**
- **slack**: Triggers fired by Slack messages
- **schedule**: Recurring or one-time scheduled triggers
- **ao_event**: Triggers fired by internal AO state transitions (e.g., a session entering needs_input or failed). These back the \`wake_me_up_when_session_changes_state\` tool.

A trigger may have multiple conditions (OR semantics) — filtering by trigger_type returns triggers that have at least one condition of that type.

**Use cases:**
- View configured automations (scheduled tasks, Slack integrations, ao_event waiters)
- Check trigger status and execution history
- Discover available Slack channels for new triggers`;

// Returns a deduped, ordered list of condition types present on a trigger.
function summarizeConditionTypes(conditions: TriggerCondition[] | undefined): string {
  if (!conditions || conditions.length === 0) return '(none)';
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const c of conditions) {
    if (!seen.has(c.condition_type)) {
      seen.add(c.condition_type);
      ordered.push(c.condition_type);
    }
  }
  return ordered.join(', ');
}

export function searchTriggersTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'search_triggers',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'number',
          description:
            'Get a specific trigger by ID. Returns trigger details with recent sessions.',
        },
        trigger_type: {
          type: 'string',
          enum: TRIGGER_TYPE_VALUES,
          description:
            "Filter to triggers having at least one condition of this type. Maps to the API's `condition_type` query parameter.",
        },
        status: {
          type: 'string',
          enum: ['enabled', 'disabled'],
          description: 'Filter by status.',
        },
        include_channels: {
          type: 'boolean',
          description: 'Include available Slack channels. Default: false',
        },
        page: { type: 'number', minimum: 1, description: 'Page number. Default: 1' },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Results per page. Default: 25',
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validated = SearchTriggersSchema.parse(args);
        const client = clientFactory();

        if (validated.id) {
          const response = await client.getTrigger(validated.id);
          const t: Trigger = response.trigger;
          const lines = [
            `## Trigger: ${t.name}`,
            '',
            `- **ID:** ${t.id}`,
            `- **Conditions:** ${summarizeConditionTypes(t.conditions)}`,
            `- **Status:** ${t.status}`,
            `- **Agent Root:** ${t.agent_root_name}`,
            `- **Reuse Session:** ${t.reuse_session ? 'Yes' : 'No'}`,
            `- **MCP Servers:** ${t.mcp_servers && t.mcp_servers.length > 0 ? t.mcp_servers.join(', ') : '(none)'}`,
          ];
          if (t.stop_condition) lines.push(`- **Stop Condition:** ${t.stop_condition}`);
          lines.push(`- **Sessions Created:** ${t.sessions_created_count}`);
          if (t.last_triggered_at) lines.push(`- **Last Triggered:** ${t.last_triggered_at}`);
          lines.push('', '### Prompt Template', '```', t.prompt_template, '```');
          if (t.conditions && t.conditions.length > 0) {
            lines.push('', '### Conditions');
            t.conditions.forEach((c) => {
              lines.push(`- **${c.condition_type}** — ${c.description}`);
              if (c.configuration && Object.keys(c.configuration).length > 0) {
                lines.push('  ```json');
                JSON.stringify(c.configuration, null, 2)
                  .split('\n')
                  .forEach((line) => lines.push(`  ${line}`));
                lines.push('  ```');
              }
            });
          }
          if (response.recent_sessions && response.recent_sessions.length > 0) {
            lines.push('', '### Recent Sessions');
            response.recent_sessions.forEach((s) => {
              lines.push(`- **#${s.id}** ${s.title} (${s.status})`);
            });
          }
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        // List triggers
        const response = await client.listTriggers({
          trigger_type: validated.trigger_type,
          status: validated.status,
          page: validated.page,
          per_page: validated.per_page,
        });

        const lines: string[] = [];
        if (response.triggers.length === 0) {
          lines.push('## Triggers\n\nNo triggers found.');
        } else {
          lines.push(
            `## Triggers (${response.pagination.total_count} total, page ${response.pagination.page} of ${response.pagination.total_pages})`,
            ''
          );
          response.triggers.forEach((t) => {
            lines.push(`### ${t.name} (ID: ${t.id})`);
            lines.push(
              `- **Conditions:** ${summarizeConditionTypes(t.conditions)} | **Status:** ${t.status} | **Sessions:** ${t.sessions_created_count}`
            );
            if (t.conditions && t.conditions.length > 0) {
              t.conditions.forEach((c) => {
                lines.push(`  - ${c.description}`);
              });
            }
            lines.push('');
          });
        }

        if (validated.include_channels) {
          try {
            const channels = await client.getTriggerChannels();
            lines.push('', '## Available Slack Channels', '');
            if (channels.channels.length === 0) {
              lines.push('No Slack channels available.');
            } else {
              channels.channels.forEach((ch) => {
                lines.push(
                  `- **#${ch.name}** (${ch.id}) - ${ch.num_members} members${ch.is_private ? ' [private]' : ''}`
                );
              });
            }
          } catch (error) {
            lines.push(
              '',
              `*Could not fetch Slack channels: ${error instanceof Error ? error.message : 'Unknown error'}*`
            );
          }
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching triggers: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
