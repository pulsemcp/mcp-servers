import type { ToolResponse } from './types.js';

/**
 * Create a standard text response
 */
export function createTextResponse(text: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Create a success response with a message
 */
export function createSuccessResponse(message: string): ToolResponse {
  return createTextResponse(message);
}

/**
 * Create a response with multiple content items
 */
export function createMultiContentResponse(
  contents: Array<{ type: string; text: string }>
): ToolResponse {
  return {
    content: contents,
  };
}

/**
 * Create an empty response
 */
export function createEmptyResponse(): ToolResponse {
  return {
    content: [],
  };
}
