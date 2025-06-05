import { z } from "zod";
import type { ToolResponse } from "@pulsemcp/shared";
import { createInputSchema, createTextResponse, createErrorResponse } from "@pulsemcp/shared";
import type { ExampleClient } from "../clients/exampleClient.js";

// Define the arguments schema (empty for this tool)
const ListKeysArgsSchema = z.object({});

// Export the arguments interface
export interface ListKeysArgs {}

// Define the tool
export const listKeysTool = {
  name: "list_keys",
  description: "List all available keys in the example data store",
  inputSchema: createInputSchema(ListKeysArgsSchema),
};

// Implement the tool handler
export async function listKeys(
  args: ListKeysArgs,
  client: ExampleClient
): Promise<ToolResponse> {
  try {
    const keys = client.getAllKeys();
    
    if (keys.length === 0) {
      return createTextResponse("No keys found in the data store");
    }

    return createTextResponse(`Available keys: ${keys.join(", ")}`);
  } catch (error) {
    return createErrorResponse(error);
  }
}