import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function registerResources(server: Server) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'langfuse://config',
          name: 'Server Configuration',
          description:
            'Current Langfuse MCP server configuration and status. Useful for debugging and verifying setup.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'langfuse://config') {
      const config = {
        server: {
          name: 'langfuse-mcp-server',
          version: '0.1.0',
          transport: 'stdio',
        },
        environment: {
          LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY ? '***configured***' : 'not set',
          LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY ? '***configured***' : 'not set',
          LANGFUSE_BASE_URL:
            process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com (default)',
        },
        capabilities: {
          tools: true,
          resources: true,
        },
      };

      return {
        contents: [
          {
            uri: 'langfuse://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
