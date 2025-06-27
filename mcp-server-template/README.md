# MCP Server NAME

DESCRIPTION

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
   cp -r mcp-server-template experimental/myserver

   # For production servers
   cp -r mcp-server-template myserver

   cd myserver
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
NAME-mcp-server/
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

## Configuration

### Environment Variables

The server validates required environment variables at startup. If any required variables are missing, it will exit with a helpful error message.

Update the `validateEnvironment()` function in `local/src/index.ts` with your server's requirements:

```typescript
const required = [
  { name: 'YOUR_API_KEY', description: 'API key for authentication' },
  { name: 'YOUR_ENDPOINT', description: 'API endpoint URL' },
];

const optional = [{ name: 'YOUR_TIMEOUT', description: 'Request timeout in milliseconds' }];
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

**Note**: This section is about clients for external APIs (REST, GraphQL, databases, etc.), NOT MCP clients.

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

## Publishing to npm

This template uses a workspace structure with `local` and `shared` directories. To handle this for npm publishing:

### How It Works

#### Development Setup
During development, the `local` package references the `shared` package via a symlink:
- `npm run dev` or `npm run build` automatically creates a symlink from `local/shared` to `shared/dist`
- This allows TypeScript to resolve imports like `import { createMCPServer } from '../shared/index.js'`
- The symlink is created by `setup-dev.js` script

#### Publishing Process
When publishing to npm, workspace file dependencies don't work. We solve this by:
1. The `prepublishOnly` script runs automatically before `npm publish`
2. It builds the project and then runs `prepare-publish.js`
3. This script copies the built `shared/dist` files into `local/shared`
4. The package is published with all necessary files included
5. No bundler or extra dependencies needed!

### Important Files
- `local/prepare-publish.js` - Copies shared files during publish
- `local/setup-dev.js` - Creates development symlink
- `.gitignore` - Ignores `local/shared` (it's either a symlink or temporary copy)

### Benefits
This approach ensures:
- Clean development experience with proper TypeScript support
- Published packages work without workspace dependencies
- No need for bundlers or extra build tools
- Maintains the monorepo benefits during development

### Publishing Steps

1. Navigate to the `local` directory
2. Update the version number in `package.json`
3. Run `npm publish`
4. The `prepublishOnly` script will handle building and bundling automatically

Note: Always publish from the `local` directory, not from the root workspace.

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
      "args": ["/path/to/NAME-mcp-server/local/build/index.js"],
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
