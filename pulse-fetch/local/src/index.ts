import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Pulse Fetch",
  version: "1.0.0"
});

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

// Add a fetch tool (simplified version for hello world)
server.tool(
  "fetch",
  { 
    url: z.string().url(),
    responseFormat: z.enum(["text", "html"]).default("text")
  },
  async ({ url, responseFormat }: { url: string; responseFormat: "text" | "html" }) => {
    try {
      // For this hello world example, we'll just return a mock response
      return {
        content: [{ 
          type: "text", 
          text: `Fetched content from ${url} in ${responseFormat} format.\nHello World from Pulse Fetch!` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error fetching content: ${(error as Error).message}` 
        }],
        isError: true
      };
    }
  }
);

// Start with stdio transport
console.error("Starting Pulse Fetch with stdio transport");
const transport = new StdioServerTransport();
await server.connect(transport); 