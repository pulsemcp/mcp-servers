import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { IAppsignalClient, AppsignalClient } from './appsignal-client.js';

// Tool schemas
export const GetAlertDetailsSchema = z.object({
  alertId: z.string().describe("The ID of the alert to retrieve"),
});

export const SearchLogsSchema = z.object({
  query: z.string().describe("The search query for logs"),
  limit: z.number().optional().default(100).describe("Maximum number of logs to return"),
  offset: z.number().optional().default(0).describe("Offset for pagination"),
});

export const GetLogsInDatetimeRangeSchema = z.object({
  startTime: z.string().describe("Start time in ISO 8601 format (e.g., 2024-01-15T10:00:00Z)"),
  endTime: z.string().describe("End time in ISO 8601 format (e.g., 2024-01-15T11:00:00Z)"),
  limit: z.number().optional().default(100).describe("Maximum number of logs to return"),
});

// Factory function to create registerTools with dependency injection
export function createRegisterTools(clientFactory: (apiKey: string, appId: string) => IAppsignalClient) {
  return function registerTools(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_alert_details",
          description: "Get detailed information about a specific alert, including status, triggers, and affected services",
          inputSchema: {
            type: "object",
            properties: {
              alertId: {
                type: "string",
                description: "The ID of the alert to retrieve",
              },
            },
            required: ["alertId"],
          },
        },
        {
          name: "search_logs",
          description: "Search through application logs with flexible query parameters and filters",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query for logs",
              },
              limit: {
                type: "number",
                description: "Maximum number of logs to return",
                default: 100,
              },
              offset: {
                type: "number",
                description: "Offset for pagination",
                default: 0,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_logs_in_datetime_range",
          description: "Retrieve logs within a specific datetime range for focused incident analysis",
          inputSchema: {
            type: "object",
            properties: {
              startTime: {
                type: "string",
                description: "Start time in ISO 8601 format (e.g., 2024-01-15T10:00:00Z)",
              },
              endTime: {
                type: "string",
                description: "End time in ISO 8601 format (e.g., 2024-01-15T11:00:00Z)",
              },
              limit: {
                type: "number",
                description: "Maximum number of logs to return",
                default: 100,
              },
            },
            required: ["startTime", "endTime"],
          },
        },
      ],
    };
  });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check for required environment variables
      const apiKey = process.env.APPSIGNAL_API_KEY;
      const appId = process.env.APPSIGNAL_APP_ID;

      if (!apiKey || !appId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: APPSIGNAL_API_KEY and APPSIGNAL_APP_ID environment variables must be configured",
            },
          ],
        };
      }

      // Create client instance
      const client = clientFactory(apiKey, appId);

      if (name === "get_alert_details") {
        const validatedArgs = GetAlertDetailsSchema.parse(args);
        
        try {
          const alert = await client.getAlertDetails(validatedArgs.alertId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(alert, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching alert details: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (name === "search_logs") {
        const validatedArgs = SearchLogsSchema.parse(args);
        
        try {
          const logs = await client.searchLogs(
            validatedArgs.query,
            validatedArgs.limit,
            validatedArgs.offset
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(logs, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error searching logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      if (name === "get_logs_in_datetime_range") {
        const validatedArgs = GetLogsInDatetimeRangeSchema.parse(args);
        
        try {
          const logs = await client.getLogsInDatetimeRange(
            validatedArgs.startTime,
            validatedArgs.endTime,
            validatedArgs.limit
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(logs, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching logs in range: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  };
}

// Default export for backward compatibility
export const registerTools = createRegisterTools((apiKey, appId) => new AppsignalClient(apiKey, appId));