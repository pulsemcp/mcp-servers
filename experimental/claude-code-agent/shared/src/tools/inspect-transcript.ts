import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { InspectTranscriptSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('inspect-transcript-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  format: 'Optional: transcript format (default: markdown)',
} as const;

export function inspectTranscriptTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'inspect_transcript',
    description: `Retrieves the subagent's conversation transcript from Claude Code's native session storage for debugging when things go astray. This tool provides access to the full conversation history, including all messages, tool calls, and responses with rich metadata.

Example response:
{
  "transcriptUri": "file:///path/to/agent/transcript.md",
  "metadata": {
    "messageCount": 8,
    "lastUpdated": "2024-01-15T10:45:30.123Z"
  }
}

Format options:
- markdown: Human-readable format with clear message separation
- json: Structured data format for programmatic analysis

Use cases:
- Debugging unexpected subagent behavior
- Reviewing conversation flow and decision making
- Analyzing tool usage patterns
- Troubleshooting errors or failed operations
- Creating audit trails of subagent activities
- Understanding how the subagent solved a problem`,

    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['markdown', 'json'],
          description: PARAM_DESCRIPTIONS.format,
        },
      },
      required: [],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = InspectTranscriptSchema.parse(args);
        const client = clientFactory();

        logger.debug(`Inspecting transcript in ${validatedArgs.format} format`);

        const result = await client.inspectTranscript(validatedArgs.format);

        logger.info(`Transcript contains ${result.metadata.messageCount} messages`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to inspect transcript:', error);
        throw error;
      }
    },
  };
}
