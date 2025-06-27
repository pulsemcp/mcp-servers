# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the MCP server template.

## Overview

This is a comprehensive template for creating new MCP servers with TypeScript, testing infrastructure, and CI/CD setup guidance. It follows a monorepo structure with local/shared separation and includes full testing capabilities.

## Using This Template

1. **Copy the entire directory** to your desired location:
   - For experimental: `cp -r mcp-server-template experimental/myname`
   - For production: `cp -r mcp-server-template myname`

2. **Replace placeholders** throughout all files:
   - `NAME` → your server name
   - `DESCRIPTION` → your server description
   - `YOUR_NAME` → author name
   - `YOUR_API_KEY` → actual environment variable names
   - `IExampleClient`/`ExampleClient` → your client interface/class names

3. **Set up CI/CD** (optional):
   - Follow the checklist in `CI_SETUP.md`
   - Delete `CI_SETUP.md` after completing setup

4. **Install and build**:
   ```bash
   npm run install-all
   npm run build
   npm test
   ```

## Template Structure

```
mcp-server-template/
├── local/                      # Local server implementation
│   ├── src/
│   │   ├── index.ts           # Main entry point
│   │   └── index.integration-with-mock.ts # Integration test entry
│   └── package.json
├── shared/                     # Shared business logic
│   ├── src/
│   │   ├── server.ts          # Server factory with DI
│   │   ├── tools.ts           # Tool registration
│   │   ├── tools/             # Individual tool implementations
│   │   │   └── example-tool.ts
│   │   ├── example-client/    # External API client (NOT MCP client!)
│   │   │   ├── CLAUDE.md      # Client documentation
│   │   │   ├── example-client.ts
│   │   │   ├── example-client.integration-mock.ts
│   │   │   └── lib/           # Modular API methods
│   │   │       ├── get-item.ts
│   │   │       └── search-items.ts
│   │   ├── resources.ts       # Resource implementations
│   │   └── types.ts           # Shared TypeScript types
│   └── package.json
├── tests/                      # Test suite
│   ├── functional/            # Unit/functional tests
│   ├── integration/           # Full MCP protocol tests
│   ├── mocks/                 # Mock implementations
│   └── README.md              # Testing documentation
├── vitest.config.ts           # Vitest configuration
├── vitest.config.integration.ts # Integration test config
├── CI_SETUP.md                # CI/CD setup checklist
└── package.json               # Root monorepo config
```

## Key Features

### Server Factory Pattern

The template uses a factory pattern in `shared/src/server.ts`:

- Enables dependency injection for better testability
- Supports both production and test configurations
- Separates server creation from handler registration

### Testing Infrastructure

Full testing setup with Vitest:

- Functional tests for isolated unit testing
- Integration tests using TestMCPClient
- Manual tests for real API validation
- Mock patterns for external dependencies
- Separate test configurations for different test types

#### Integration Mock Entry Point

The template includes `index.integration-with-mock.ts` which:

- Allows integration tests to inject mock data via environment variables
- Uses the real MCP server with mocked external dependencies
- Demonstrates clear separation between MCP protocol and external API mocking
- Enables testing various scenarios without hitting real APIs

### Development Scripts

- `npm run dev` - Development mode with auto-reload
- `npm test` - Run tests in watch mode
- `npm run test:all` - Run all tests (functional + integration)
- `npm run lint` - Check code quality
- `npm run format` - Format code

## Implementation Guide

### Environment Variable Validation

The template includes built-in environment variable validation that runs before server startup. This ensures:

- Users get clear error messages when required variables are missing
- The server fails fast with helpful guidance
- Optional variables are documented

Update the `validateEnvironment()` function in `local/src/index.ts` with your requirements:

```typescript
const required = [{ name: 'YOUR_API_KEY', description: 'API key for authentication' }];

const optional = [{ name: 'YOUR_OPTIONAL_CONFIG', description: 'Optional configuration' }];
```

### Adding Tools

The template uses a modular tool pattern where each tool is defined in its own file:

1. Create a new file in `shared/src/tools/` (e.g., `my-tool.ts`)
2. Define the tool using the factory pattern:
   ```typescript
   export function myTool(server: Server, clientFactory: () => IClient) {
     return {
       name: 'my_tool',
       description: 'Tool description',
       inputSchema: {
         /* JSON Schema */
       },
       handler: async (args: unknown) => {
         /* implementation */
       },
     };
   }
   ```
3. Add the tool to the tools array in `shared/src/tools.ts`
4. Use Zod for input validation within the handler
5. Access external APIs via the injected client factory
6. **IMPORTANT**: Follow the comprehensive [Tool Descriptions Guide](shared/src/tools/TOOL_DESCRIPTIONS_GUIDE.md) to write user-friendly tool descriptions that include examples, use cases, and detailed parameter explanations

### Adding External API Clients

The template uses a modular client pattern with a lib subdirectory for external API clients (e.g., REST APIs, GraphQL, databases - NOT MCP clients):

1. Define the interface in `shared/src/server.ts`
2. Create client directory structure:
   ```
   shared/src/your-client/
   ├── CLAUDE.md                    # Client-specific documentation
   ├── your-client.ts               # Interface exports
   ├── your-client.integration-mock.ts  # Integration test mock
   └── lib/                         # Individual API methods
       ├── method-one.ts
       └── method-two.ts
   ```
3. Implement each API method in its own file under `lib/`
4. Create the concrete client class that delegates to lib methods
5. Update the factory in server.ts to instantiate the client
6. Use via dependency injection in tools

### Writing Tests

- Functional: Test individual functions with mocked dependencies
- Integration: Test full MCP protocol with mocked external services

## Best Practices

- Use dependency injection for all external dependencies
- Write tests for all new functionality
- Follow TypeScript strict mode
- Use Zod for runtime validation
- Handle errors gracefully
- Keep business logic in shared module
- Document all tools and resources
