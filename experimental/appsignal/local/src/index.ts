#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources, registerTools } from "mcp-server-appsignal-shared";

async function main() {
  // Initialize MCP server
  const server = new McpServer({
    name: "mcp-server-appsignal",
    version: "0.1.0",
  }, {
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  // Register resources and tools from shared module
  registerResources(server);
  registerTools(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("AppSignal MCP server running on stdio");
}

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});