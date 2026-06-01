import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import { parseAllowedAgentRoots, validateAgentRootConstraints } from '../allowed-agent-roots.js';
import { getConfigsCache, setConfigsCache } from '../cache/configs-cache.js';

const PARAM_DESCRIPTIONS = {
  agent_runtime:
    'Per-spawn agent runtime override. Valid values are "claude_code" (Claude Code) and "codex" (OpenAI Codex CLI). ' +
    'When omitted, the session adopts the agent_root\'s default_runtime, falling back to "claude_code". ' +
    "Call get_configs to see each agent root's default_runtime. Pair with `config.model` to pick a model valid for the chosen runtime " +
    '(e.g. "opus"/"sonnet"/"haiku" for claude_code, "gpt-5.5"/"gpt-5.4" for codex).',
  prompt:
    'Initial prompt for the agent. If provided, the agent job is automatically queued. Omit for a clone-only session.',
  agent_root:
    'Agent root name from get_configs. The API resolves git_root, branch, subdirectory, default_model, and other defaults from the agent root configuration. Always pass this so the session inherits the correct repository, model, and settings.',
  title:
    'STRONGLY RECOMMENDED: Always set a title — treat it as effectively required. ' +
    'The title appears in the AO web UI and push notifications, making sessions identifiable at a glance. ' +
    'Compose a short, descriptive title (under 70 characters) that captures what the session is doing ' +
    '(e.g. "Fix login redirect loop on mobile Safari", "Add dark mode toggle to settings page"). ' +
    'Only omit if you truly have zero context about the session purpose, which should be extremely rare.',
  slug: 'URL-friendly identifier for the session. Must be unique.',
  goal: 'Goal ID from get_configs (e.g. "pr_merged"). The description is automatically resolved and passed to the agent as context.',
  execution_provider:
    'Execution environment. Options: "local_filesystem" (runs locally), "remote_sandbox" (runs in isolated sandbox). Default: "local_filesystem"',
  mcp_servers:
    'List of MCP server names to enable for this session. Example: ["github-development", "slack"]',
  skills:
    'List of skill names to enable for this session. Always include the agent root\'s default_skills from get_configs as the starting point — omitting skills means the session gets none. Add extras as needed; removing a default should be rare and intentional. Example: ["discovery-classify", "publish-and-pr"]',
  plugins:
    'List of plugin names to enable for this session. Plugins extend agent capabilities with additional integrations. Example: ["my-plugin"]',
  config:
    'Additional configuration as a JSON object. Use `config.model` to choose the agent model for this session ' +
    '(e.g. {"model": "gpt-5.4"} for a codex runtime, or {"model": "sonnet"} for claude_code). ' +
    "The model must be valid for the resolved agent_runtime; call get_configs to see each agent root's default_model. " +
    "When omitted, the session uses the agent root's default_model (or the runtime's default model). " +
    "An explicit config.model always takes precedence over the agent root's default_model.",
  custom_metadata:
    'User-defined metadata as a JSON object. Useful for tracking tickets, projects, etc.',
  auto_compact_window:
    'Optional per-session auto-compact (context) window override, in tokens. ' +
    '**You should generally rely on the default of 200,000** — omit this parameter and the API default applies. ' +
    'Only override in the rare situation where the spawned session is suffering from compaction thrashing because it ' +
    "doesn't have enough space to work — in that case, retry with `1000000` (1 million tokens). " +
    'Compaction thrashing is currently the only known reason to set this preemptively.',
} as const;

export const StartSessionSchema = z.object({
  agent_runtime: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_runtime),
  prompt: z.string().optional().describe(PARAM_DESCRIPTIONS.prompt),
  agent_root: z.string().optional().describe(PARAM_DESCRIPTIONS.agent_root),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  slug: z.string().optional().describe(PARAM_DESCRIPTIONS.slug),
  goal: z.string().optional().describe(PARAM_DESCRIPTIONS.goal),
  execution_provider: z
    .enum(['local_filesystem', 'remote_sandbox'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.execution_provider),
  mcp_servers: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.mcp_servers),
  skills: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.skills),
  plugins: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.plugins),
  config: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.config),
  custom_metadata: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.custom_metadata),
  auto_compact_window: z.number().int().optional().describe(PARAM_DESCRIPTIONS.auto_compact_window),
});

const TOOL_DESCRIPTION = `Start a new agent session in the Agent Orchestrator.

**IMPORTANT:** Before starting a session, call get_configs to discover available agent roots, MCP servers, goals, and their defaults.

**Returns:** The created session with its ID, status, and configuration.

**Behavior:**
- If a prompt is provided, the agent job is automatically queued to start
- If no prompt is provided, creates a clone-only session that can be started later with action_session

**Agent Roots:** Use \`agent_root\` to specify which preconfigured agent root to use. The API resolves git_root, branch, subdirectory, default_model, and other defaults from the agent root configuration.

**Defaults from Agent Roots:** The agent root defines \`default_mcp_servers\`, \`default_skills\`, and optionally a \`default_goal\`. Omitting \`mcp_servers\` or \`skills\` means the session gets NONE — there is no automatic fallback to defaults.

- **MCP servers:** Start with \`default_mcp_servers\`. Drop servers the task doesn't need (least-privilege). Add extras when the task requires tools beyond the defaults. When \`ALLOWED_AGENT_ROOTS\` is active, you cannot add servers beyond the defaults.
- **Skills:** Start with \`default_skills\`. You can freely add skills beyond the defaults. Removing a default skill should be rare and intentional — only when you have a specific reason, like replacing a skill with a more capable variant that covers the same ground. Skills are lightweight text files with no blast radius, so keeping all defaults costs nothing.

**Runtime and model selection:** Pass \`agent_runtime\` to override which agent runtime the session uses — \`claude_code\` (Claude Code) or \`codex\` (OpenAI Codex CLI). Pass \`config: { model: "..." }\` to choose the model (e.g. \`opus\`/\`sonnet\`/\`haiku\` for claude_code, \`gpt-5.5\`/\`gpt-5.4\` for codex). Both are optional: when omitted, the session inherits the agent root's \`default_runtime\` and \`default_model\`. Call get_configs to discover each root's defaults and pick a model that is valid for the chosen runtime.

**Use cases:**
- Start a new agent task on a repository
- Create a session to work on a specific branch
- Set up an agent with specific MCP servers and skills enabled
- Create a session with custom metadata for tracking`;

export function startSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'start_session',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_runtime: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_runtime,
        },
        prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prompt,
        },
        agent_root: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_root,
        },
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
        goal: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.goal,
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
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.skills,
        },
        plugins: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.plugins,
        },
        config: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.config,
        },
        custom_metadata: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.custom_metadata,
        },
        auto_compact_window: {
          type: 'integer',
          description: PARAM_DESCRIPTIONS.auto_compact_window,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = StartSessionSchema.parse(args);
        const client = clientFactory();

        // Enforce ALLOWED_AGENT_ROOTS constraints if set
        const allowedRoots = parseAllowedAgentRoots();
        if (allowedRoots !== null) {
          // Ensure we have configs (fetch if not cached)
          let configs = getConfigsCache();
          if (!configs) {
            configs = await client.getConfigs();
            setConfigsCache(configs);
          }

          const validation = validateAgentRootConstraints(
            allowedRoots,
            configs.agent_roots,
            validatedArgs.agent_root,
            validatedArgs.mcp_servers
          );

          if (!validation.valid) {
            return {
              content: [{ type: 'text', text: `Error starting session: ${validation.error}` }],
              isError: true,
            };
          }
        }

        // Resolve goal ID to its description so the agent receives
        // meaningful context about when to stop, not just an opaque identifier.
        let createArgs = validatedArgs;
        if (validatedArgs.goal) {
          let configs = getConfigsCache();
          if (!configs) {
            configs = await client.getConfigs();
            setConfigsCache(configs);
          }
          const match = configs.goals.find((sc) => sc.id === validatedArgs.goal);
          if (match) {
            createArgs = { ...validatedArgs, goal: match.description };
          }
        }

        const session = await client.createSession(createArgs);

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
