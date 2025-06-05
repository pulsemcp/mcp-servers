import { z } from "zod";
import type { ToolResponse } from "@pulsemcp/shared";
import { createInputSchema, createTextResponse, createErrorResponse } from "@pulsemcp/shared";
import type { ExampleClient } from "../clients/exampleClient.js";

// Define the arguments schema
const GetValueArgsSchema = z.object({
  key: z.string().describe("The key to retrieve"),
});

// Export the arguments interface
export interface GetValueArgs {
  key: string;
}

// Define the tool
export const getValueTool = {
  name: "get_value",
  description: "Get a value from the example data store by key",
  inputSchema: createInputSchema(GetValueArgsSchema),
};

// Implement the tool handler
export async function getValue(
  args: GetValueArgs,
  client: ExampleClient
): Promise<ToolResponse> {
  try {
    const value = client.getValue(args.key);
    
    if (value === undefined) {
      return createTextResponse(`No value found for key: ${args.key}`);
    }

    return createTextResponse(value);
  } catch (error) {
    return createErrorResponse(error);
  }
}