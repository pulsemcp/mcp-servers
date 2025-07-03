import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IExampleClient } from '../example-client/example-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  message: 'The message to process',
} as const;

// Schema for tool input validation
export const ExampleToolSchema = z.object({
  message: z.string().describe(PARAM_DESCRIPTIONS.message),
});

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
    description: 'An example tool that processes a message',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.message,
        },
      },
      required: ['message'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ExampleToolSchema.parse(args);

        // Get client instance for this request
        // const client = _clientFactory();

        // Example: Use the client if needed
        // const result = await client.someMethod(validatedArgs.message);

        return {
          content: [
            {
              type: 'text',
              text: `Processed message: ${validatedArgs.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
