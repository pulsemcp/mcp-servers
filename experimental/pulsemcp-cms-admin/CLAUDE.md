# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the PulseMCP CMS Admin MCP server.

## Overview

This is an internal MCP server for managing PulseMCP's content management system. It provides tools for newsletter management, image uploads, and other content operations. The server is designed for internal use by the PulseMCP team and requires API keys that are not publicly available.

## API Integration

This server integrates with the PulseMCP Admin API at `https://admin.pulsemcp.com`. All requests require authentication via the `X-API-Key` header.

### Endpoints Used

- **Posts Management**:
  - `GET /posts` - List newsletter posts with search and pagination
  - `GET /posts/:slug` - Get specific post by slug
  - `POST /posts` - Create new newsletter post
  - `PUT /posts/:slug` - Update existing post

- **Image Upload**:
  - `POST /upload_image` - Upload images to cloud storage

### Authentication

The server uses API key authentication. The key must be set as the `PULSEMCP_ADMIN_API_KEY` environment variable.

## Key Implementation Details

### Tools

1. **get_newsletter_posts**: Fetches a paginated list of posts from the `/posts` endpoint
2. **get_newsletter_post**: Retrieves a specific post by slug
3. **draft_newsletter_post**: Creates a new draft post with full metadata
4. **update_newsletter_post**: Updates an existing post by slug
5. **upload_image**: Handles image upload with multipart form data (requires post_slug and file_name)

### Post Metadata Fields

Posts support the following fields:

- **Required**: `title`, `body`, `slug`, `author_id`
- **Status/Category**: `status` (draft/live), `category` (newsletter/other)
- **Images**: `image_url`, `preview_image_url`, `share_image`
- **SEO**: `title_tag`, `short_title`, `short_description`, `description_tag`
- **Structure**: `table_of_contents` (JSON), `last_updated`
- **Associations**: `featured_mcp_server_ids[]`, `featured_mcp_client_ids[]`

### Error Handling

- 401 errors indicate invalid API key
- 403 errors indicate the user lacks admin privileges
- 422 errors indicate validation failures

## Template Structure

```
mcp-server-template/
├── scripts/                    # Build and publication scripts
│   └── prepare-npm-readme.js  # README concatenation for npm
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
│   │   └── types.ts           # Shared TypeScript types
│   └── package.json
├── tests/                      # Test suite
│   ├── functional/            # Unit/functional tests
│   ├── integration/           # Full MCP protocol tests
│   ├── mocks/                 # Mock implementations
│   └── README.md              # Testing documentation
├── vitest.config.ts           # Vitest configuration
├── vitest.config.integration.ts # Integration test config
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

### README Preparation for npm Publication

The template includes automatic README preparation for npm publication:

- **Script**: `scripts/prepare-npm-readme.js` runs during `prepublishOnly`
- **Combines READMEs**: Merges main README with local configuration sections
- **Adds repository reference**: Links to GitHub monorepo for context
- **Customizable**: Update server name pattern and repository URL when copying template

This ensures published npm packages have comprehensive documentation with proper repository references.

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
- Document all tools

## Development Workflow

- **Changelog Updates**: Always update the CHANGELOG.md file when making changes to this MCP server to track improvements and maintain version history

## Logging

This server uses a centralized logging module (`shared/src/logging.ts`) for all output. **IMPORTANT**: Never use `console.log` directly in server code as it interferes with the MCP protocol (stdout must only contain JSON messages).

Instead, use the logging functions:

- `logServerStart(serverName)` - Log server startup
- `logError(context, error)` - Log errors with context
- `logWarning(context, message)` - Log warnings
- `logDebug(context, message)` - Log debug info (only when NODE_ENV=development or DEBUG=true)

All logging functions output to stderr to maintain MCP protocol compliance.
