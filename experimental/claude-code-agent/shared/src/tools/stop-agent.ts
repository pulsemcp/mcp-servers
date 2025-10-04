import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { StopAgentSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('stop-agent-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  force: 'Optional: force kill if graceful shutdown fails (default: false)',
} as const;

export function stopAgentTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'stop_agent',
    description: `Gracefully stops the running subagent. This tool ensures proper cleanup of resources and saves the final agent state before termination.

Example response:
{
  "status": "stopped",
  "finalState": {
    "sessionId": "abc123-def456-789",
    "status": "idle",
    "systemPrompt": "You are a helpful assistant",
    "installedServers": ["com.postgres/mcp", "com.pulsemcp/fetch"],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "lastActiveAt": "2024-01-15T10:45:30.123Z",
    "workingDirectory": "/path/to/agent"
  }
}

Status meanings:
- stopped: Agent stopped gracefully
- force_killed: Agent was forcefully terminated
- failed: Stop operation failed

Use cases:
- Cleaning up after task completion
- Stopping a misbehaving subagent
- Freeing system resources
- Ending a subagent session
- Emergency termination with force flag
- Preparing for system shutdown`,

    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.force,
        },
      },
      required: [],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = StopAgentSchema.parse(args);
        const client = clientFactory();

        logger.debug(`Stopping agent${validatedArgs.force ? ' (force)' : ''}`);

        const result = await client.stopAgent(validatedArgs.force);

        logger.info(`Agent ${result.status} successfully`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to stop agent:', error);
        throw error;
      }
    },
  };
}
