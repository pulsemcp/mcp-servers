import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IExampleClient } from '../example-client/example-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================
// Define all parameter descriptions in one place to prevent drift between
// Zod validation messages and MCP tool schema descriptions.
// This pattern ensures consistency across the codebase.
// =============================================================================

const PARAM_DESCRIPTIONS = {
  message:
    'The message to process. Can be any text string that you want to transform or analyze. ' +
    'Examples: "Hello world", "Process this data", "Analyze sentiment"',
  format:
    'Output format for the processed message. Options: "plain" (default), "json", "markdown". ' +
    'Use "json" when you need structured output, "markdown" for formatted text.',
  verbose:
    'Enable verbose output with additional metadata. When true, includes processing time, ' +
    'character count, and transformation details. Default: false',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const ExampleToolSchema = z.object({
  message: z.string().min(1).describe(PARAM_DESCRIPTIONS.message),
  format: z
    .enum(['plain', 'json', 'markdown'])
    .default('plain')
    .describe(PARAM_DESCRIPTIONS.format),
  verbose: z.boolean().default(false).describe(PARAM_DESCRIPTIONS.verbose),
});

// =============================================================================
// TOOL DESCRIPTION - Structured Format
// =============================================================================
// Follow this pattern for comprehensive tool descriptions:
// 1. Brief intro - What the tool does (1-2 sentences)
// 2. Detailed explanation - How it works and what it returns
// 3. Return format - Exactly what format the response is in
// 4. Use cases - Specific real-world scenarios
// 5. Notes - Important caveats or limitations
// =============================================================================

const TOOL_DESCRIPTION = `Process and transform a message with optional formatting.

This tool takes an input message and processes it according to the specified format. It can output plain text, structured JSON, or formatted markdown.

**Returns:**
- Plain format: The processed message as simple text
- JSON format: Structured object with message, length, and timestamp
- Markdown format: Formatted text with headers and emphasis

**Use cases:**
- Transform user input before sending to another service
- Generate formatted responses for different output channels
- Validate and clean message content
- Add metadata to messages for logging or analytics

**Note:** This is an example tool demonstrating the template patterns. Replace with your actual implementation.`;

/**
 * Factory function for creating the example tool.
 * This pattern allows for dependency injection and better testability.
 *
 * @param server - The MCP server instance
 * @param clientFactory - Factory function that returns a client instance
 * @returns The registered tool
 */
export function exampleTool(_server: Server, _clientFactory: () => IExampleClient) {
  return {
    name: 'example_tool',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.message,
        },
        format: {
          type: 'string',
          enum: ['plain', 'json', 'markdown'],
          default: 'plain',
          description: PARAM_DESCRIPTIONS.format,
        },
        verbose: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.verbose,
        },
      },
      required: ['message'],
    },
    handler: async (args: unknown) => {
      const startTime = Date.now();

      try {
        const validatedArgs = ExampleToolSchema.parse(args);
        const { message, format, verbose } = validatedArgs;

        // Get client instance for this request (uncomment when needed)
        // const client = _clientFactory();
        // const result = await client.someMethod(message);

        // Process the message based on format
        let output: string;

        switch (format) {
          case 'json':
            output = JSON.stringify(
              {
                message: message,
                length: message.length,
                timestamp: new Date().toISOString(),
                ...(verbose && {
                  processingTimeMs: Date.now() - startTime,
                  wordCount: message.split(/\s+/).length,
                }),
              },
              null,
              2
            );
            break;

          case 'markdown':
            output = `## Processed Message\n\n**Content:** ${message}\n\n**Length:** ${message.length} characters`;
            if (verbose) {
              output += `\n**Words:** ${message.split(/\s+/).length}`;
              output += `\n**Processed at:** ${new Date().toISOString()}`;
            }
            break;

          default:
            output = `Processed: ${message}`;
            if (verbose) {
              output += ` (${message.length} chars, ${Date.now() - startTime}ms)`;
            }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        // Always return user-friendly error messages with isError flag
        return {
          content: [
            {
              type: 'text',
              text: `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
