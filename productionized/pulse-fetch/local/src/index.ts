import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerResources, registerTools } from 'pulse-fetch-shared';

// Create an MCP server
const server = new McpServer({
  name: 'Pulse Fetch Local',
  version: '1.0.0',
});

// Register shared resources and tools
registerResources(server);
registerTools(server);

// Start with stdio transport
console.error('Starting Pulse Fetch with stdio transport');
const transport = new StdioServerTransport();
await server.connect(transport);
