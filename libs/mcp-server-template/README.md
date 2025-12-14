# MCP Server NAME

DESCRIPTION

## Highlights

- Modular monorepo architecture with local/shared separation
- Comprehensive testing setup (functional, integration, manual)
- Tool grouping system for permission-based access control
- Dependency injection for better testability
- TypeScript with strict type checking
- Development mode with automatic rebuilds
- Pre-configured linting and formatting
- Health checks for API credential validation

## Capabilities

### Tools

| Tool           | Group                  | Description                                            |
| -------------- | ---------------------- | ------------------------------------------------------ |
| `example_tool` | readonly, write, admin | Process and transform messages with formatting options |
| `search_items` | readonly, write, admin | Search for items or look up by ID with pagination      |

### Resources

| Resource         | Description                                     |
| ---------------- | ----------------------------------------------- |
| `NAME://config`  | Server configuration and status (for debugging) |
| `NAME://example` | Example resource implementation                 |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                                   |
| ---------- | --------------------------------------------- |
| `readonly` | Read-only operations (search, get, list)      |
| `write`    | Write operations (create, update)             |
| `admin`    | Administrative operations (delete, configure) |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `ENABLED_TOOLGROUPS="readonly,write"` - Read and write, no admin
- Not set - All tools enabled (default)

## Quick Start

### Using This Template

1. **Copy the template to your desired location**

   ```bash
   # For experimental servers
   cp -r libs/mcp-server-template experimental/myserver

   # For production servers
   cp -r libs/mcp-server-template productionized/myserver

   cd experimental/myserver  # or productionized/myserver
   ```

2. **Replace placeholders throughout the codebase**

   Search and replace these values:
   - `NAME` -> your server name (e.g., `weather`, `github`)
   - `DESCRIPTION` -> your server description
   - `YOUR_NAME` -> your name (for package.json author field)
   - `YOUR_API_KEY` -> your actual environment variable name
   - `IExampleClient`/`ExampleClient` -> your actual client interface/class

   **Naming Convention:**
   - **Experimental servers**: Use simple names like `weather-mcp-server`
   - **Productionized servers**: Use scoped npm names like `@pulsemcp/weather`

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
│   │   ├── index.ts      # Main entry point with env validation
│   │   └── index.integration-with-mock.ts  # Integration test entry
│   ├── build/            # Compiled output
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory with DI
│   │   ├── tools.ts      # Tool registration with grouping
│   │   ├── tools/        # Individual tool implementations
│   │   │   ├── example-tool.ts
│   │   │   └── search-tool.ts
│   │   ├── resources.ts  # Resource implementations
│   │   ├── state.ts      # Dynamic state management
│   │   ├── logging.ts    # Centralized logging
│   │   ├── types.ts      # Shared types
│   │   └── example-client/  # External API client
│   │       ├── lib/      # Modular API methods
│   │       └── CLAUDE.md # Client documentation
│   ├── build/            # Compiled output
│   └── package.json
├── tests/                # Test suite
│   ├── functional/       # Unit tests with mocks
│   ├── integration/      # MCP protocol tests
│   ├── manual/          # Real API tests
│   └── mocks/           # Mock implementations
├── scripts/             # Build and test scripts
├── package.json         # Root workspace config
├── vitest.config.ts     # Functional test config
├── vitest.config.integration.ts  # Integration test config
├── vitest.config.manual.ts       # Manual test config
├── CHANGELOG.md         # Version history
├── MANUAL_TESTING.md    # Test results tracking
└── CI_SETUP.md          # CI setup guide (delete after setup)
```

## Configuration

### Environment Variables

| Variable             | Required | Description                    | Default     |
| -------------------- | -------- | ------------------------------ | ----------- |
| `YOUR_API_KEY`       | Yes      | API key for authentication     | -           |
| `YOUR_WORKSPACE_ID`  | No       | Workspace/organization ID      | -           |
| `ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups    | All enabled |
| `SKIP_HEALTH_CHECKS` | No       | Skip API validation at startup | `false`     |

The server validates required environment variables at startup. If any are missing, it exits with a helpful error message including examples.

### Claude Desktop Configuration

If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "NAME": {
      "command": "npx",
      "args": ["-y", "NAME-mcp-server"],
      "env": {
        "YOUR_API_KEY": "your-api-key-here",
        "ENABLED_TOOLGROUPS": "readonly,write"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Development

### Running in Development Mode

```bash
npm run dev
```

This watches for changes and automatically rebuilds.

### Testing

```bash
# Run functional tests in watch mode
npm test

# Run tests once
npm run test:run

# Run integration tests (full MCP protocol)
npm run test:integration

# Run manual tests (real APIs - requires .env)
npm run test:manual:setup  # First time only
npm run test:manual

# Run all automated tests
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

1. **Create a new tool file** in `shared/src/tools/`

   ```typescript
   // shared/src/tools/my-tool.ts
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   import { z } from 'zod';
   import { IExampleClient } from '../example-client/example-client.js';

   const PARAM_DESCRIPTIONS = {
     param: 'Description of the parameter with examples',
   } as const;

   export const MyToolSchema = z.object({
     param: z.string().describe(PARAM_DESCRIPTIONS.param),
   });

   export function myTool(_server: Server, clientFactory: () => IExampleClient) {
     return {
       name: 'my_tool',
       description: `Brief description.
   
   **Returns:** What the tool returns
   
   **Use cases:**
   - When to use this tool
   - Another scenario`,
       inputSchema: {
         type: 'object' as const,
         properties: {
           param: { type: 'string', description: PARAM_DESCRIPTIONS.param },
         },
         required: ['param'],
       },
       handler: async (args: unknown) => {
         try {
           const validatedArgs = MyToolSchema.parse(args);
           const client = clientFactory();
           // Implementation...
           return { content: [{ type: 'text', text: 'Result' }] };
         } catch (error) {
           return {
             content: [
               {
                 type: 'text',
                 text: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
               },
             ],
             isError: true,
           };
         }
       },
     };
   }
   ```

2. **Register the tool** in `shared/src/tools.ts`

   ```typescript
   import { myTool } from './tools/my-tool.js';

   const ALL_TOOLS: ToolDefinition[] = [
     // ... existing tools
     { factory: myTool, groups: ['write', 'admin'] },
   ];
   ```

3. **Update the README** capabilities table

### Adding Resources

Update `shared/src/resources.ts` following the existing pattern. The config resource shows how to expose server status for debugging.

### Using External APIs

See `shared/src/example-client/CLAUDE.md` for the complete guide on:

- Interface-first design pattern
- Modular API methods in `lib/` subdirectory
- Testing strategies (functional, integration, manual)
- Adding new API methods

### Writing Tests

See `tests/README.md` for comprehensive testing documentation including:

- Three-tier testing strategy
- Mock organization patterns
- Integration test architecture
- Manual testing procedures

## Publishing to npm

### How It Works

The template uses a workspace structure with symlinks for development and file copying for publishing:

1. **Development**: Symlinks enable live editing of shared code
2. **Publishing**: `prepare-publish.js` copies built files for npm

### Publishing Steps

1. Navigate to the `local` directory
2. Run `npm run stage-publish` to bump version
3. Update `CHANGELOG.md` with changes
4. Update `MANUAL_TESTING.md` with test results
5. Commit all changes
6. Create PR - CI will publish on merge

**Important**: Always publish from the `local` directory, not from the root workspace.

## Usage Tips

- **Start with the config resource**: Read `NAME://config` to verify your setup
- **Use tool groups**: Restrict access for different use cases
- **Check health on startup**: Validates credentials before first use
- **Enable verbose mode**: Some tools support `verbose: true` for debugging

## License

MIT
