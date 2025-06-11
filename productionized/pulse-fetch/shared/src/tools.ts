import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register shared tools to an MCP server
 */
export function registerTools(server: McpServer): void {
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
} 