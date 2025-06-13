import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ClientFactory } from './server.js';

// Example tool schema
const ExampleToolSchema = z.object({
  message: z.string().describe('The message to process'),
});

export function createRegisterTools(clientFactory: ClientFactory) {
  return (server: Server) => {
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

        // Get client instance for this request
        // const client = clientFactory();
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
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  };
}

// Keep the original registerTools for backward compatibility
export function registerTools(server: Server) {
  // This maintains compatibility but doesn't use dependency injection
  const factory = () => {
    throw new Error('No client factory provided - use createRegisterTools for dependency injection');
  };
  const register = createRegisterTools(factory);
  register(server);
}
