import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Example tool schema
const ExampleToolSchema = z.object({
  message: z.string().describe('The message to process'),
});

export function registerTools(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'example_tool',
          description: 'An example tool that processes a message',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The message to process',
              },
            },
            required: ['message'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'example_tool') {
      const validatedArgs = ExampleToolSchema.parse(args);

      return {
        content: [
          {
            type: 'text',
            text: `Processed message: ${validatedArgs.message}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });
}
