#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from "zod";
import {
  validateEnvironment,
  logServerStart,
  logError,
  createMethodNotFoundError,
  createInvalidRequestError,
  createInternalError,
} from "@pulsemcp/shared";

// Import client
import { ExampleClient } from "./clients/exampleClient.js";

// Import tools
import {
  getValueTool,
  getValue,
  setValueTool,
  setValue,
  listKeysTool,
  listKeys,
  type GetValueArgs,
  type SetValueArgs,
  type ListKeysArgs,
} from "./tools/index.js";

// Load environment variables
dotenv.config();

// Validate environment variables (add your required env vars here)
const envSchema = z.object({
  // Example: API_KEY: z.string().min(1),
});

async function main() {
  // Validate environment
  try {
    validateEnvironment(envSchema);
  } catch (error) {
    logError("Environment validation", error);
    process.exit(1);
  }

  // Initialize clients
  const exampleClient = new ExampleClient();

  // Initialize server
  const server = new Server(
    {
      name: "mcp-server-NAME",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const keys = exampleClient.getAllKeys();
    
    return {
      resources: keys.map(key => ({
        uri: `example://data/${key}`,
        name: `Example: ${key}`,
        description: `Value stored at key: ${key}`,
        mimeType: "text/plain",
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    if (uri.startsWith("example://data/")) {
      const key = uri.slice("example://data/".length);
      const value = exampleClient.getValue(key);
      
      if (value === undefined) {
        throw createInvalidRequestError(`No value found for key: ${key}`);
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: value,
          },
        ],
      };
    }
    
    throw createInvalidRequestError(`Unknown resource: ${uri}`);
  });

  // Tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        getValueTool,
        setValueTool,
        listKeysTool,
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case "get_value":
          return await getValue(args as GetValueArgs, exampleClient);
          
        case "set_value":
          return await setValue(args as SetValueArgs, exampleClient);
          
        case "list_keys":
          return await listKeys(args as ListKeysArgs, exampleClient);
          
        default:
          throw createMethodNotFoundError(name);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw createInternalError(error);
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logServerStart("NAME", "stdio");
}

// Run the server
main().catch((error) => {
  logError("Fatal error", error);
  process.exit(1);
});