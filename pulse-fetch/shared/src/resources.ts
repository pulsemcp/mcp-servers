import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register shared resources to an MCP server
 */
export function registerResources(server: McpServer): void {
  // Add a hello world resource
  server.resource(
    "hello",
    new ResourceTemplate("hello://{name}", { list: undefined }),
    async (uri: URL, { name }: { name?: string }) => ({
      contents: [{
        uri: uri.href,
        text: `Hello, ${name || "World"}!`
      }]
    })
  );
} 