import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const ACTION_ENUM = ['create', 'update', 'delete', 'toggle'] as const;

export const ActionTriggerSchema = z.object({
  action: z.enum(ACTION_ENUM),
  id: z.number().optional(),
  name: z.string().optional(),
  trigger_type: z.enum(['slack', 'schedule']).optional(),
  agent_root_name: z.string().optional(),
  prompt_template: z.string().optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
  stop_condition: z.string().optional(),
  reuse_session: z.boolean().optional(),
  mcp_servers: z.array(z.string()).optional(),
  configuration: z.record(z.unknown()).optional(),
});

const TOOL_DESCRIPTION = `Create, update, delete, or toggle automation triggers.

**Actions:**
- **create**: Create a new trigger (requires name, trigger_type, agent_root_name, prompt_template)
- **update**: Update an existing trigger (requires "id")
- **delete**: Delete a trigger (requires "id")
- **toggle**: Enable/disable a trigger (requires "id")

**Trigger types:**
- **slack**: Triggered by Slack events (requires configuration with channel_id)
- **schedule**: Triggered on a schedule (requires configuration with interval, unit, etc.)

Use search_triggers first to see available triggers and Slack channels.`;

export function actionTriggerTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'action_trigger',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ACTION_ENUM, description: 'Action to perform.' },
        id: { type: 'number', description: 'Trigger ID. Required for update, delete, toggle.' },
        name: { type: 'string', description: 'Trigger name. Required for create.' },
        trigger_type: {
          type: 'string',
          enum: ['slack', 'schedule'],
          description: 'Trigger type. Required for create.',
        },
        agent_root_name: { type: 'string', description: 'Agent root name. Required for create.' },
        prompt_template: { type: 'string', description: 'Prompt template. Required for create.' },
        status: { type: 'string', enum: ['enabled', 'disabled'], description: 'Trigger status.' },
        stop_condition: { type: 'string', description: 'Stop condition for triggered sessions.' },
        reuse_session: { type: 'boolean', description: 'Whether to reuse existing sessions.' },
        mcp_servers: {
          type: 'array',
          items: { type: 'string' },
          description: 'MCP servers for triggered sessions.',
        },
        configuration: {
          type: 'object',
          description: 'Type-specific configuration (schedule, Slack channel, etc.).',
        },
      },
      required: ['action'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ActionTriggerSchema.parse(args);
        const client = clientFactory();
        const { action, id } = validated;

        let result: string;

        switch (action) {
          case 'create': {
            if (
              !validated.name ||
              !validated.trigger_type ||
              !validated.agent_root_name ||
              !validated.prompt_template
            ) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "name", "trigger_type", "agent_root_name", and "prompt_template" are required for the "create" action.',
                  },
                ],
                isError: true,
              };
            }
            const trigger = await client.createTrigger({
              name: validated.name,
              trigger_type: validated.trigger_type,
              agent_root_name: validated.agent_root_name,
              prompt_template: validated.prompt_template,
              status: validated.status,
              stop_condition: validated.stop_condition,
              reuse_session: validated.reuse_session,
              mcp_servers: validated.mcp_servers,
              configuration: validated.configuration,
            });
            result = [
              '## Trigger Created',
              '',
              `- **ID:** ${trigger.id}`,
              `- **Name:** ${trigger.name}`,
              `- **Type:** ${trigger.trigger_type}`,
              `- **Status:** ${trigger.status}`,
              `- **Agent Root:** ${trigger.agent_root_name}`,
            ].join('\n');
            break;
          }

          case 'update': {
            if (!id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "id" is required for the "update" action.' },
                ],
                isError: true,
              };
            }
            const trigger = await client.updateTrigger(id, {
              name: validated.name,
              trigger_type: validated.trigger_type,
              agent_root_name: validated.agent_root_name,
              prompt_template: validated.prompt_template,
              status: validated.status,
              stop_condition: validated.stop_condition,
              reuse_session: validated.reuse_session,
              mcp_servers: validated.mcp_servers,
              configuration: validated.configuration,
            });
            result = `## Trigger Updated\n\n- **ID:** ${trigger.id}\n- **Name:** ${trigger.name}\n- **Status:** ${trigger.status}`;
            break;
          }

          case 'delete': {
            if (!id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "id" is required for the "delete" action.' },
                ],
                isError: true,
              };
            }
            await client.deleteTrigger(id);
            result = `## Trigger Deleted\n\nTrigger ${id} has been deleted.`;
            break;
          }

          case 'toggle': {
            if (!id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "id" is required for the "toggle" action.' },
                ],
                isError: true,
              };
            }
            const trigger = await client.toggleTrigger(id);
            result = `## Trigger Toggled\n\n- **ID:** ${trigger.id}\n- **Name:** ${trigger.name}\n- **New Status:** ${trigger.status}`;
            break;
          }

          default: {
            const _exhaustiveCheck: never = action;
            return {
              content: [{ type: 'text', text: `Error: Unknown action "${_exhaustiveCheck}"` }],
              isError: true,
            };
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error managing trigger: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
