import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerState } from './state.js';

export function registerResources(server: Server, version: string) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'dynamodb://config',
          name: 'Server Configuration',
          description:
            'Current DynamoDB MCP server configuration and status. Useful for debugging and verifying setup.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read resource contents
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'dynamodb://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 'dynamodb-mcp-server',
          version,
          transport: 'stdio',
        },
        environment: {
          AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'not set',
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '***configured***' : 'not set',
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '***configured***' : 'not set',
          DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'default (AWS)',
          DYNAMODB_ENABLED_TOOL_GROUPS: process.env.DYNAMODB_ENABLED_TOOL_GROUPS || 'all (default)',
          DYNAMODB_ENABLED_TOOLS: process.env.DYNAMODB_ENABLED_TOOLS || 'not set',
          DYNAMODB_DISABLED_TOOLS: process.env.DYNAMODB_DISABLED_TOOLS || 'not set',
          DYNAMODB_ALLOWED_TABLES: process.env.DYNAMODB_ALLOWED_TABLES || 'all (default)',
          SKIP_HEALTH_CHECKS: process.env.SKIP_HEALTH_CHECKS || 'false',
        },
        state: {
          selectedResourceId: state.selectedResourceId || 'none',
          isResourceLocked: state.isResourceLocked,
        },
        capabilities: {
          tools: true,
          resources: true,
        },
        toolGroups: {
          readonly: [
            'list_tables',
            'describe_table',
            'get_item',
            'query_items',
            'scan_table',
            'batch_get_items',
          ],
          readwrite: ['put_item', 'update_item', 'delete_item', 'batch_write_items'],
          admin: ['create_table', 'delete_table', 'update_table'],
        },
      };

      return {
        contents: [
          {
            uri: 'dynamodb://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
