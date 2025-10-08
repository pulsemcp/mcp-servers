import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { ChatSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('chat-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  prompt: 'Message/task to send to the subagent',
  timeout:
    'Optional: timeout in milliseconds (default: 300000 = 5 minutes). Increase for complex operations.',
} as const;

export function chatTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'chat',
    description: `Sends a message to the subagent and waits for the response. The subagent will process the message using its installed MCP servers and return the result. This is the primary way to interact with the configured subagent.

Example response:
{
  "response": "I've analyzed the PostgreSQL database and found the issue. The slow query is due to a missing index on the users table...",
  "metadata": {
    "tokensUsed": 1250,
    "duration": 15420,
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}

Timeout Configuration:
- Default: 300000ms (5 minutes) - suitable for most tasks
- Quick operations: 30000-60000ms (30s-1min) for simple queries or single-tool tasks
- Standard operations: 300000ms (5min) for multi-step analysis, code changes, or database operations
- Complex operations: 600000-1200000ms (10-20min) for large codebase analysis, extensive data processing, or multi-server workflows
- Heavy operations: 1800000ms+ (30min+) for comprehensive system analysis, large file operations, or complex automation

Examples of operations requiring longer timeouts:
- Analyzing large codebases (10+ min)
- Processing multiple API calls in sequence (5-15 min)
- Complex database migrations or large query results (10-30 min)
- Multi-step workflows involving file operations, web scraping, and analysis (15-30 min)
- System monitoring and log analysis across multiple sources (5-20 min)

Use cases:
- Executing tasks with the properly configured subagent
- Running complex operations that require multiple MCP servers
- Debugging issues using specialized tools
- Analyzing data with task-specific capabilities
- Automating workflows through the subagent
- Long-running operations with custom timeout settings`,

    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prompt,
        },
        timeout: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.timeout,
        },
      },
      required: ['prompt'],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = ChatSchema.parse(args);
        const client = clientFactory();

        logger.debug('Sending chat message to subagent');

        const startTime = Date.now();
        const result = await client.chat(validatedArgs.prompt, validatedArgs.timeout);
        const duration = Date.now() - startTime;

        logger.info(
          `Chat completed in ${duration}ms${result.metadata.tokensUsed ? `, used ${result.metadata.tokensUsed} tokens` : ''}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Chat failed:', error);
        throw error;
      }
    },
  };
}
