# Tools Directory

This directory contains individual tool implementations following the factory pattern. Each tool is defined in its own file for better modularity, testability, and maintainability.

## Tool Structure

Each tool file should export a factory function with the following signature:

```typescript
export function toolNameTool(server: Server, clientFactory: () => IYourClient) {
  return {
    name: 'tool_name',
    description: 'Tool description',
    inputSchema: {
      /* JSON Schema */
    },
    handler: async (args: unknown) => {
      // Tool implementation
    },
  };
}
```

## Creating a New Tool

1. Create a new file in this directory (e.g., `my-new-tool.ts`)
2. Define the input schema using Zod for validation
3. Implement the factory function following the pattern above
4. Add the tool to the tools array in `../tools.ts`

## Example

See `example-tool.ts` for a complete example implementation.

## Benefits

- **Modularity**: Each tool is self-contained in its own file
- **Testability**: Tools can be easily unit tested in isolation
- **Type Safety**: Full TypeScript support with proper typing
- **Dependency Injection**: Client instances are injected via factory pattern
- **Maintainability**: Easy to find, modify, or remove individual tools
