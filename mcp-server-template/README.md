# MCP Server NAME

DESCRIPTION

<!-- Verify: Non-AppSignal change with All CI Checks -->

## Features

- 🏗️ Modular monorepo architecture with local/shared separation
- 🧪 Comprehensive testing setup with Vitest
- 🔧 Dependency injection for better testability
- 📝 TypeScript with strict type checking
- 🚀 Development mode with automatic rebuilds
- ✅ Pre-configured linting and formatting

## Quick Start

### Using This Template

1. **Copy the template to your desired location**

   ```bash
   # For experimental servers
   cp -r mcp-server-template experimental/mcp-server-myserver

   # For production servers
   cp -r mcp-server-template mcp-server-myserver

   cd mcp-server-myserver
   ```

2. **Replace placeholders throughout the codebase**

   Search and replace these values:

   - `NAME` → your server name (e.g., `weather`, `github`)
   - `DESCRIPTION` → your server description
   - `YOUR_NAME` → your name (for package.json author field)
   - `YOUR_API_KEY` → your actual environment variable name
   - `IExampleClient`/`ExampleClient` → your actual client interface/class

3. **Install dependencies**

   ```bash
   npm run install-all
   ```

4. **Set up CI/CD (optional)**

   Follow the checklist in `CI_SETUP.md` to configure GitHub Actions, then delete the file.

5. **Build and test**

   ```bash
   npm run build
   npm test
   ```

## Project Structure

```
mcp-server-NAME/
├── local/                 # Local server implementation
│   ├── src/
│   │   ├── index.ts      # Main entry point
│   │   └── index.integration.ts  # Integration test entry
│   ├── build/            # Compiled output
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory
│   │   ├── tools.ts      # Tool implementations
│   │   ├── resources.ts  # Resource implementations
│   │   └── types.ts      # Shared types
│   ├── dist/             # Compiled output
│   └── package.json
├── tests/                # Test suite
│   ├── functional/       # Unit tests
│   ├── integration/      # Integration tests
│   └── mocks/           # Mock implementations
├── package.json          # Root package.json
├── vitest.config.ts      # Test configuration
└── CI_SETUP.md          # CI setup guide (delete after setup)
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This watches for changes and automatically rebuilds.

### Testing

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run integration tests
npm run test:integration

# Run all tests (functional + integration)
npm run test:all

# Open test UI
npm run test:ui
```

### Linting and Formatting

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Implementation Guide

### Adding Tools

1. **Define the tool in `shared/src/tools.ts`**

   ```typescript
   const MyToolSchema = z.object({
     param: z.string().describe('Parameter description'),
   });
   ```

2. **Add to the tools list**

   ```typescript
   tools: [
     {
       name: 'my_tool',
       description: 'What this tool does',
       inputSchema: {...},
     },
   ]
   ```

3. **Implement the handler**

   ```typescript
   if (name === 'my_tool') {
     const validatedArgs = MyToolSchema.parse(args);
     const client = clientFactory();

     // Use client to perform operations
     const result = await client.doSomething(validatedArgs.param);

     return {
       content: [
         {
           type: 'text',
           text: result,
         },
       ],
     };
   }
   ```

### Adding Resources

Update `shared/src/resources.ts` to add new resources following the existing pattern.

### Using External APIs

1. **Define client interface in `shared/src/server.ts`**

   ```typescript
   export interface IMyApiClient {
     fetchData(id: string): Promise<Data>;
   }
   ```

2. **Implement the client**

   ```typescript
   export class MyApiClient implements IMyApiClient {
     constructor(private apiKey: string) {}

     async fetchData(id: string): Promise<Data> {
       // Implementation
     }
   }
   ```

3. **Use dependency injection in tools**

   The client factory pattern allows easy mocking for tests.

### Writing Tests

#### Functional Tests

Test individual functions/tools in isolation:

```typescript
// tests/functional/tools.test.ts
describe('my_tool', () => {
  it('should process data correctly', async () => {
    const mockClient = createMockClient();
    mockClient.fetchData.mockResolvedValue({ data: 'test' });

    // Test your tool with the mock
  });
});
```

#### Integration Tests

Test the full MCP protocol:

```typescript
// tests/integration/NAME.integration.test.ts
it('should handle my_tool via MCP', async () => {
  const client = await createMockedClient({
    mockData: {
      /* ... */
    },
  });

  const result = await client.callTool('my_tool', {
    param: 'test',
  });

  expect(result.content[0].text).toBe('expected result');
});
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration:

#### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "NAME": {
      "command": "node",
      "args": ["/path/to/mcp-server-NAME/local/build/index.js"],
      "env": {
        "YOUR_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Tools

### example_tool

An example tool that processes a message.

**Input:**

- `message` (string, required): The message to process

**Returns:**

- Processed message text

## Resources

### example://resource

An example resource that returns static content.

## License

MIT
