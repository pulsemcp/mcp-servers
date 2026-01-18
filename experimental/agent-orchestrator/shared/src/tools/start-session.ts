import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const PARAM_DESCRIPTIONS = {
  agent_type:
    'Agent type for the session. Currently only "claude_code" is supported. Default: "claude_code"',
  prompt:
    'Initial prompt for the agent. If provided, the agent job is automatically queued. Omit for a clone-only session.',
  git_root:
    'Repository URL or local path. Examples: "https://github.com/example/repo.git", "/path/to/repo"',
  branch: 'Git branch to work on. Default: "main"',
  subdirectory: 'Subdirectory within the repository to focus on.',
  title: 'Display title for the session. Used for identification in the UI.',
  slug: 'URL-friendly identifier for the session. Must be unique.',
  stop_condition:
    'Condition that determines when the agent should stop. Passed to the agent as context.',
  execution_provider:
    'Execution environment. Options: "local_filesystem" (runs locally), "remote_sandbox" (runs in isolated sandbox). Default: "local_filesystem"',
  mcp_servers:
    'List of MCP server names to enable for this session. Example: ["github-development", "slack"]',
  config: 'Additional configuration as a JSON object.',
  custom_metadata:
    'User-defined metadata as a JSON object. Useful for tracking tickets, projects, etc.',
} as const;

export const StartSessionSchema = z.object({
  agent_type: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_type),
  prompt: z.string().optional().describe(PARAM_DESCRIPTIONS.prompt),
  git_root: z.string().optional().describe(PARAM_DESCRIPTIONS.git_root),
  branch: z.string().optional().describe(PARAM_DESCRIPTIONS.branch),
  subdirectory: z.string().optional().describe(PARAM_DESCRIPTIONS.subdirectory),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  slug: z.string().optional().describe(PARAM_DESCRIPTIONS.slug),
  stop_condition: z.string().optional().describe(PARAM_DESCRIPTIONS.stop_condition),
  execution_provider: z
    .enum(['local_filesystem', 'remote_sandbox'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.execution_provider),
  mcp_servers: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.mcp_servers),
  config: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.config),
  custom_metadata: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.custom_metadata),
});

const TOOL_DESCRIPTION = `Start a new agent session in the Agent Orchestrator.

**Returns:** The created session with its ID, status, and configuration.

**Behavior:**
- If a prompt is provided, the agent job is automatically queued to start
- If no prompt is provided, creates a clone-only session that can be started later with action_session

**Use cases:**
- Start a new agent task on a repository
- Create a session to work on a specific branch
- Set up an agent with specific MCP servers enabled
- Create a session with custom metadata for tracking

**Tip:** Use get_available_mcp_servers first to see available options for the mcp_servers parameter.`;

export function startSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'start_session',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_type: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_type,
        },
        prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prompt,
        },
        git_root: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.git_root,
        },
        branch: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.branch,
        },
        subdirectory: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.subdirectory,
        },
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
        stop_condition: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.stop_condition,
        },
        execution_provider: {
          type: 'string',
          enum: ['local_filesystem', 'remote_sandbox'],
          description: PARAM_DESCRIPTIONS.execution_provider,
        },
        mcp_servers: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.mcp_servers,
        },
        config: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.config,
        },
        custom_metadata: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.custom_metadata,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = StartSessionSchema.parse(args);
        const client = clientFactory();

        const session = await client.createSession(validatedArgs);

        const lines = [
          `## Session Started Successfully`,
          '',
          `- **ID:** ${session.id}`,
          `- **Title:** ${session.title}`,
          `- **Status:** ${session.status}`,
        ];

        if (session.slug) lines.push(`- **Slug:** ${session.slug}`);
        if (session.job_id) {
          lines.push(`- **Job ID:** ${session.job_id}`);
          lines.push('');
          lines.push('*The agent job has been queued and will start shortly.*');
        } else {
          lines.push('');
          lines.push(
            '*No prompt was provided. Use action_session with "follow_up" or "restart" action to start the agent.*'
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
              text: `Error starting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
