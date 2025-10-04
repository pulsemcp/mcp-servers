import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { FindServersSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('find-servers-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  task_prompt: 'Description of the task to accomplish',
} as const;

export function findServersTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'find_servers',
    description: `Analyzes your trusted servers list to determine which MCP servers are relevant for the given task. This tool uses intelligent analysis to match task requirements with server capabilities, ensuring the subagent only gets the tools it needs.

Example response:
{
  "servers": [
    {
      "name": "com.postgres/mcp",
      "rationale": "Database queries needed for analyzing user data"
    },
    {
      "name": "com.pulsemcp/appsignal",
      "rationale": "Error logs and monitoring data required for debugging"
    },
    {
      "name": "com.pulsemcp/fetch",
      "rationale": "Web fetching capabilities for API interactions"
    }
  ]
}

Use cases:
- Automatically selecting relevant MCP servers based on task description
- Avoiding tool overload by only choosing necessary servers
- Matching task requirements to server capabilities
- Optimizing context window usage by selective server installation
- Discovering server combinations for complex multi-tool tasks`,

    inputSchema: {
      type: 'object',
      properties: {
        task_prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.task_prompt,
        },
      },
      required: ['task_prompt'],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = FindServersSchema.parse(args);
        const client = clientFactory();

        logger.debug('Finding servers for task:', validatedArgs.task_prompt);

        const result = await client.findServers(validatedArgs.task_prompt);

        logger.info(`Found ${result.servers.length} relevant servers`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to find servers:', error);

        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: 'text',
                text: `Invalid arguments: ${error.errors.map((e) => e.message).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Error finding servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
