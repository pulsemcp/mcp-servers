import { z } from "zod";
import type { ToolResponse } from "@pulsemcp/shared";
import { createInputSchema, createSuccessResponse, createErrorResponse } from "@pulsemcp/shared";
import type { ExampleClient } from "../clients/exampleClient.js";

// Define the arguments schema
const SetValueArgsSchema = z.object({
  key: z.string().describe("The key to set"),
  value: z.string().describe("The value to store"),
});

// Export the arguments interface
export interface SetValueArgs {
  key: string;
  value: string;
}

// Define the tool
export const setValueTool = {
  name: "set_value",
  description: "Set a value in the example data store",
  inputSchema: createInputSchema(SetValueArgsSchema),
};

// Implement the tool handler
export async function setValue(
  args: SetValueArgs,
  client: ExampleClient
): Promise<ToolResponse> {
  try {
    client.setValue(args.key, args.value);
    
    return createSuccessResponse(`Successfully set value for key: ${args.key}`);
  } catch (error) {
    return createErrorResponse(error);
  }
}