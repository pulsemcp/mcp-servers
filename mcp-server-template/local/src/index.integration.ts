#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'mcp-server-NAME-shared';

// Mock client for integration tests
class MockExampleClient {
  constructor(private mockData: any) {}
  
  // Implement your mock methods here based on IExampleClient interface
}

async function main() {
  // Parse mock configuration from environment variable
  const mockConfig = process.env.MOCK_CONFIG ? JSON.parse(process.env.MOCK_CONFIG) : {};
  
  // Create server with mock client factory
  const { server, registerHandlers } = createMCPServer();
  
  // Register handlers with mock client factory
  await registerHandlers(server, () => new MockExampleClient(mockConfig));
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('NAME MCP server (integration test mode) running on stdio');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});