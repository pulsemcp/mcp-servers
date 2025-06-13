# MCP Server Template

A comprehensive template for building Model Context Protocol (MCP) servers with TypeScript, following best practices and patterns.

## Features

- 🏗️ Modular architecture with clear separation of concerns
- 🛠️ Example tools demonstrating proper implementation patterns
- 📦 Example resources with dynamic URI handling
- 🔧 Environment variable support with validation
- 🧩 Shared utilities in a `shared` folder
- 📝 TypeScript with strict type checking
- 🚀 Development mode with automatic rebuilds

## Quick Start

1. **Clone or copy this template**

   ```bash
   cp -r mcp-server-template mcp-server-myserver
   cd mcp-server-myserver
   ```

2. **Replace placeholders**

   - In `package.json`: Replace `NAME` with your server name, `DESCRIPTION` with your description
   - In `src/index.ts`: Replace `NAME` with your server name
   - Update this README with your server's specific information

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Build the server**
   ```bash
   npm run build
   ```

## Project Structure

```
mcp-server-NAME/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── env.d.ts          # TypeScript environment declarations
│   ├── clients/          # Business logic clients
│   │   └── exampleClient.ts
│   └── tools/            # Tool implementations
│       ├── index.ts      # Tool exports
│       ├── getValue.ts
│       ├── setValue.ts
│       └── listKeys.ts
├── build/                # Compiled JavaScript (git ignored)
├── package.json
├── tsconfig.json
└── README.md
```

## Development Guide

### Running in Development Mode

```bash
npm run dev
```

This starts the TypeScript compiler in watch mode, automatically rebuilding when you make changes.

### Adding Environment Variables

1. Update `src/env.d.ts`:

   ```typescript
   declare namespace NodeJS {
     interface ProcessEnv {
       API_KEY: string;
       DATABASE_URL: string;
     }
   }
   ```

2. Update the validation schema in `src/index.ts`:

   ```typescript
   const envSchema = z.object({
     API_KEY: z.string().min(1),
     DATABASE_URL: z.string().url(),
   });
   ```

3. Create a `.env` file (git ignored):
   ```
   API_KEY=your-api-key
   DATABASE_URL=postgresql://localhost/mydb
   ```

### Adding New Tools

1. Create a new file in `src/tools/`:

   ```typescript
   import { z } from 'zod';
   import type { ToolResponse } from '@pulsemcp/shared';
   import { createInputSchema, createTextResponse, createErrorResponse } from '@pulsemcp/shared';

   const MyToolArgsSchema = z.object({
     param: z.string().describe('Description of parameter'),
   });

   export interface MyToolArgs {
     param: string;
   }

   export const myToolTool = {
     name: 'my_tool',
     description: 'What this tool does',
     inputSchema: createInputSchema(MyToolArgsSchema),
   };

   export async function myTool(args: MyToolArgs, client: ExampleClient): Promise<ToolResponse> {
     try {
       // Implementation
       return createTextResponse('Success!');
     } catch (error) {
       return createErrorResponse(error);
     }
   }
   ```

2. Export from `src/tools/index.ts`:

   ```typescript
   export { myToolTool, myTool, type MyToolArgs } from './myTool.js';
   ```

3. Add to the tools list and handler in `src/index.ts`

### Adding New Clients

Create specialized clients for different aspects of your business logic:

```typescript
export class DatabaseClient {
  constructor(private connectionString: string) {}

  async query(sql: string): Promise<any[]> {
    // Implementation
  }
}
```

## Using Shared Utilities

This template uses `shared` for common MCP patterns:

### Response Helpers

- `createTextResponse(text)` - Create a simple text response
- `createSuccessResponse(message)` - Create a success message
- `createErrorResponse(error)` - Create an error response
- `createMultiContentResponse(contents)` - Create multi-part responses

### Error Utilities

- `getErrorMessage(error)` - Safely extract error messages
- `createInvalidRequestError(message)` - Create MCP errors
- `createMethodNotFoundError(method)` - Create method not found errors
- `createInternalError(error)` - Create internal errors

### Validation Helpers

- `createInputSchema(zodSchema)` - Convert Zod schemas to JSON Schema
- `validateEnvironment(schema)` - Validate environment variables
- `parseResourceUri(uri, prefix)` - Parse resource URIs
- `buildResourceUri(protocol, type, id)` - Build consistent URIs

### Logging

- `logServerStart(name, transport)` - Log server startup
- `logError(context, error)` - Log errors with context
- `logWarning(context, message)` - Log warnings
- `logDebug(context, message)` - Debug logging (dev mode only)

## Configuration with Claude Desktop

Add to your Claude Desktop configuration file:

### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "NAME": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-NAME/build/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Example Resources

The template includes example resources that are dynamically generated:

- `example://data/greeting` - Returns "Hello, World!"
- `example://data/timestamp` - Returns the server start timestamp

Resources are automatically discovered based on the data in your clients.

## Example Tools

The template includes three example tools:

### `get_value`

Retrieves a value from the data store by key.

- **Input**: `key` (string) - The key to retrieve
- **Output**: The stored value or an error message

### `set_value`

Stores a value in the data store.

- **Input**: `key` (string), `value` (string) - The key-value pair to store
- **Output**: Success confirmation

### `list_keys`

Lists all available keys in the data store.

- **Input**: None
- **Output**: Comma-separated list of keys

## Best Practices

1. **Modular Structure**: Keep tools, clients, and utilities separate
2. **Error Handling**: Always use try-catch and return appropriate errors
3. **Type Safety**: Define interfaces for all arguments and use TypeScript strictly
4. **Validation**: Validate inputs with Zod schemas
5. **Dependency Injection**: Pass clients to tools rather than importing directly
6. **Environment Variables**: Validate all required environment variables on startup
7. **Logging**: Use stderr for logging (stdout is reserved for MCP communication)

## Troubleshooting

### Build Errors

- Ensure all `.js` extensions are included in imports
- Check that TypeScript version matches the template

### Runtime Errors

- Verify environment variables are set correctly
- Check Claude Desktop logs for detailed error messages
- Ensure the built files exist in the `build/` directory

### Tool Not Found

- Verify tool is exported from `tools/index.ts`
- Check tool is added to the tools list in `index.ts`
- Ensure tool name matches in all locations

## License

MIT
