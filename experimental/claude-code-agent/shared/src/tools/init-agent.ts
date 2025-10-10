import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { InitAgentSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('init-agent-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  system_prompt: 'Custom system prompt for the subagent',
  working_directory: 'Absolute path where the agent should operate',
  agent_id: 'Identifier for state directory naming',
} as const;

export function initAgentTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'init_agent',
    description: `Initializes a Claude Code subagent with a custom system prompt and working directory. This tool creates a new Claude Code instance in an isolated environment, separating the working directory (where the agent operates) from the state directory (where state.json is stored).

Example response:
{
  "sessionId": "abc123-def456-789",
  "status": "idle",
  "stateUri": "file:///path/to/state/directory/state.json"
}

Status meanings:
- idle: Agent is ready to receive commands
- working: Agent is currently processing a request

Use cases:
- Starting a new task-specific Claude Code instance in a specific project directory
- Creating an isolated environment for sensitive operations
- Setting up a specialized agent with domain-specific knowledge
- Initializing an agent before installing task-relevant MCP servers`,

    inputSchema: {
      type: 'object',
      properties: {
        system_prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.system_prompt,
        },
        working_directory: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.working_directory,
        },
        agent_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.agent_id,
        },
      },
      required: ['system_prompt', 'working_directory'],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = InitAgentSchema.parse(args);
        const client = clientFactory();

        logger.debug(
          'Initializing agent with system prompt length:',
          validatedArgs.system_prompt.length,
          'working directory:',
          validatedArgs.working_directory,
          'agent ID:',
          validatedArgs.agent_id
        );

        const result = await client.initAgent(
          validatedArgs.system_prompt,
          validatedArgs.working_directory,
          validatedArgs.agent_id
        );

        logger.info('Agent initialized successfully:', result.sessionId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to initialize agent:', error);
        throw error;
      }
    },
  };
}
