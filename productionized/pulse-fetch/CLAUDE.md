# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Pulse Fetch MCP server.

## Overview

Pulse Fetch is an MCP server that pulls specific resources from the internet into context for agent-building frameworks. It uses a modular architecture with shared components between local and remote implementations.

## Architecture

The server uses a three-layer architecture:

1. **`shared/`**: Core business logic, resources, and tools
   - Exports `registerResources()` and `registerTools()` functions
   - Contains all feature implementations
   - Built as a separate package referenced by local/remote

2. **`local/`**: Stdio transport implementation
   - Minimal wrapper around shared functionality
   - Uses StdioServerTransport for Claude Desktop integration
   - References shared via: `"pulse-fetch-shared": "file:../shared"`

3. **`remote/`**: HTTP transport implementation (planned)
   - Will provide hosted/remote access
   - Will share same features from shared module

## Development Commands

### Shared Module

```bash
cd shared
npm install
npm run build
```

### Local Module

```bash
cd local
npm install
npm run build     # Automatically builds shared first
npm start         # Run production server
npm run dev       # Development with auto-reload (builds shared first)
```

## Implementation Notes

- The prebuild/predev scripts ensure shared is always built first
- All new features should be added to the shared module
- Currently implements a simple "hello" resource and mock "fetch" tool
- The local module is just a thin wrapper that registers shared functionality

## Implemented Features

The server now includes:

- **Smart scraping tool** with three-tier fallback logic:
  1. Native fetch (fastest, basic)
  2. Firecrawl API (enhanced content extraction)
  3. BrightData Web Unlocker (anti-bot bypass)
- **Comprehensive test suite** with functional, integration, and mock tests
- **Environment variable validation** with startup logging
- **Content processing** with truncation and pagination support
- **Error handling** with detailed Zod validation

## Claude Learnings

Key insights gathered during implementation and CI troubleshooting:

### MCP Server Development Patterns

- **Tool Registration**: MCP servers use `server.setRequestHandler()` for `ListToolsRequestSchema` and `CallToolRequestSchema`, not individual `server.tool()` calls
- **Functional vs Integration Testing**:
  - Functional tests should directly test tool functions (e.g., `scrapeTool(server, clientFactory)`) with mocked dependencies
  - Integration tests use `TestMCPClient` to test the full server via IPC transport
  - Don't try to mock server registration - test the actual tool functions

### TypeScript and MCP SDK Usage

- **Import Patterns**: Use `@modelcontextprotocol/sdk/server/index.js` not `/server/mcp.js`
- **Tool Structure**: Tools return objects with `{ name, description, inputSchema, handler }` properties
- **Error Handling**: Tools should return error responses with `isError: true` rather than throwing exceptions
- **Type Safety**: Avoid `Function` type - use proper function signatures like `(args: unknown) => Promise<unknown>`

### Testing Strategy for MCP Servers

- **Mock Client Factory Pattern**: Use dependency injection with client factories for easy mocking
- **Workspace Package Dependencies**: When packages aren't in package-lock.json, run `npm install` from the project root and commit the updated lock file
- **TestMCPClient API**: Use `client.disconnect()` not `client.close()`, and `client.callTool()` for tool testing

### CI/CD and Release Management

- **Pre-commit Hooks**: Always run linting from repository root, not subdirectories, to ensure consistent tooling
- **Package-lock.json Sync**: CI failures with "Cannot find module" often indicate package-lock.json is out of sync - regenerate with `npm install`

### Debugging Complex Build Issues

- **Incremental Problem Solving**: When multiple systems fail (functional tests, integration tests, CI), fix one at a time and verify each step
- **Log Analysis**: CI logs provide exact error messages - read them carefully to understand root causes rather than guessing
- **Symlink Management**: Development setups with symlinks (like `setup-dev.js`) require proper import paths that work in both dev and publish scenarios

### Smart Fallback Implementation

- **Error Handling**: Use try-catch blocks without error parameters (`catch { }`) to avoid unused variable warnings
- **Content Processing**: Implement truncation and pagination at the tool level for better user experience
- **Service Validation**: Validate environment variables at startup and log available services for debugging

### Manual Testing and Client Architecture

- **Class-Based Client Design**: Following the twist-client pattern, create client classes with consistent interfaces (`scrape(url, options)`) rather than standalone functions
- **Manual Test Suite Strategy**: Create individual test files for each client with one-liner commands for easy debugging - essential for testing external API integrations
- **Success/Failure Detection**: Use specific success indicators in test output (e.g., "✅ [Client] scraping successful") to properly distinguish between actual failures and expected error content
- **Test Output Formatting**: Include content analysis, response statistics, and character distribution analysis to help understand how different scraping services behave with various content types

### Publication and CI Process

- **Publication Process**: Follow the detailed guidelines in `/docs/PUBLISHING_SERVERS.md` for version bumping, changelog updates, and automated publishing
- **Merge Conflict Resolution**: When rebasing onto main during publication, combine changelog entries from both branches preserving the intent of all changes (e.g., merge README fixes with feature additions)
- **CI Monitoring**: Use `gh run list --branch <branch-name>` to check workflow runs when `gh pr checks` doesn't show results - CI may complete successfully even if checks aren't visible in PR view
- **CI Failure Debugging**: When CI fails, use `gh run view <run-id> --log-failed --repo <owner>/<repo>` to see detailed failure logs. Common issues include: tests expecting old behavior after code changes, and manual test results referencing commits outside the PR's history
- **MANUAL_TESTING.md Updates**: When CI's verify-publications check fails due to manual test commit mismatch, update the commit reference in MANUAL_TESTING.md to a commit within the current PR. The CI validates that manual tests were run on a commit that's part of the PR being verified
- **Test Updates After Protocol Changes**: When fixing protocol compliance issues (like embedded resource structures), remember to update all related functional tests that verify the output format. Tests often check specific properties on response objects and need to be updated to match the new structure

### Environment Variable Management and UX

- **Consistent Naming**: When refactoring environment variables, ensure consistency across all files (code, tests, documentation) to avoid subtle bugs and user confusion
- **User Experience**: Remove technical prefixes (like "Bearer ") from environment variables and handle them programmatically - users shouldn't need to understand implementation details
- **Documentation Files**: Always provide .env.example files that match the patterns used in similar servers (twist, appsignal) for consistency across the monorepo

### Development Workflow

- **Changelog Updates**: Always update the CHANGELOG.md file when making changes to this MCP server to track improvements and maintain version history
- **Resource Storage Implementation**: When implementing storage interfaces, use a factory pattern with environment variable configuration to allow easy switching between backends without code changes
- **Version Bumping Process**: After running `npm version`, immediately check git status to ensure all modified files (package.json, package-lock.json in multiple locations) are staged together in the same commit

### Test Isolation and Storage Patterns

- **Storage Factory Singleton**: ResourceStorageFactory maintains a singleton instance that can cause test pollution across test suites. Always call `ResourceStorageFactory.reset()` in beforeEach hooks to ensure test isolation
- **Timestamp-based URI Collisions**: Memory storage generates URIs using millisecond timestamps. Rapid writes within the same millisecond can cause URI collisions where one resource overwrites another. Add small delays (1ms) between writes in tests to ensure unique timestamps
- **Test URL Uniqueness**: Always use unique URLs in tests (e.g., append `Date.now()`) to avoid cross-test pollution when tests share storage instances
- **Mock Isolation in Functional Tests**: When using vi.doMock() for mocking modules, be aware that mocks may persist across tests. Consider resetting mocks or using unique test data to avoid interference

### Extract Feature Implementation

- **Conditional Parameter Display**: When implementing features that depend on configuration (like LLM providers), use factory pattern with `isAvailable()` checks to conditionally include parameters in tool schemas - this provides better UX by only showing options that are actually usable
- **Model Version Updates**: When updating default model versions across the codebase (e.g., from claude-3-5-sonnet to claude-sonnet-4), remember to update test expectations as well - tests often verify exact model names in API calls
- **Resource Name Format Changes**: Be aware that changing resource naming patterns (e.g., from "Scraped: domain" to full URL) requires updating test expectations that use string matchers or regex patterns
- **Comprehensive Parameter Documentation**: For complex features like natural language extraction, provide detailed parameter descriptions with categorized examples (simple, formatted, structured, complex) - this dramatically improves user understanding and adoption
- **Type Inference with Conditional Schemas**: When using Zod schemas that conditionally include fields, TypeScript may struggle with type inference. Use type assertions (e.g., `validatedArgs as { extract?: string }`) or check for field existence before accessing to avoid compilation errors

### Content Filtering Architecture

- **Modular Filter Design**: When implementing content filtering, use a factory pattern with content type detection and specialized filters for different formats (HTML, JSON, XML). This allows easy extension and maintenance
- **HTML Content Extraction**: The dom-to-semantic-markdown library provides excellent HTML-to-Markdown conversion with built-in main content extraction. It automatically removes navigation, ads, and boilerplate while preserving semantic structure
- **Filter Integration Points**: Apply filtering after content fetching but before LLM processing to maximize context window efficiency. Always include graceful fallbacks to raw content if filtering fails
- **Monorepo Dependency Synchronization**: When adding production dependencies in workspace-based monorepos, ensure they're added to both `shared/package.json` AND `local/package.json`. The local package needs these dependencies for the published npm package to work correctly
- **Multi-tier Resource Storage**: Resources are now saved in three stages (raw, cleaned, extracted) to enable debugging and reuse. FileSystem storage uses subdirectories, Memory storage uses prefixed URIs. The `writeMulti` method ensures atomic writes across all tiers with shared filenames for correlation
- **Content Cleaning Architecture**: Renamed "filter" to "clean" throughout for clarity. The `cleanScrape` parameter (default: true) controls HTML-to-Markdown conversion independently of extraction. Cleaning is decoupled from extraction, allowing cleaned content without LLM processing

### .js files

- **Git and JavaScript Files**: When creating JavaScript utility scripts in a TypeScript project, remember that .gitignore often excludes all .js files. Use `git add -f` to force-add necessary scripts or add specific exceptions to .gitignore to ensure CI has access to required files

### MCP Protocol Compliance

- **Embedded Resource Structure**: When returning embedded resources in tool results, the MCP protocol requires wrapping the resource data in a `resource` property. The correct structure is `{ type: "resource", resource: { uri: "...", name: "...", ... } }`, not `{ type: "resource", uri: "...", name: "...", ... }`. This applies to both fresh responses and cached data
- **Testing Protocol Compliance**: Always validate tool responses against the MCP SDK's `CallToolResultSchema` to ensure protocol compliance. The MCP inspector will reject improperly formatted responses, even if they work in some clients
- **Resource Types in Tool Results**: Valid content types for MCP tool results are: `text`, `image`, `audio`, `resource_link`, and `resource` (with embedded data). Each has specific required fields per the protocol specification

### Authentication Error Handling

- **Silent Failure Prevention**: When implementing API integrations, always check for authentication errors explicitly and return them immediately to users. Silent failures that swallow authentication errors lead to confusing generic error messages
- **Error Response Extraction**: Different APIs return error details in different formats - some in JSON response bodies, others as plain text. Always attempt to extract the actual error message from the response to provide meaningful feedback to users
- **Strategy Pattern with Early Returns**: In fallback strategy patterns, check for authentication errors after each strategy attempt and return immediately rather than continuing to other strategies. This prevents wasting time on additional API calls that will also fail due to the same credential issues

### Cache Key Generation and Storage Design

- **Multi-dimensional Cache Keys**: When implementing caching, consider all parameters that affect the output. For scraped content with extraction, both URL and extract prompt must be part of the cache key - using only URL leads to incorrect cache hits
- **Storage Interface Evolution**: When adding new lookup methods to storage interfaces (like `findByUrlAndExtract`), implement them in all concrete implementations (Memory, FileSystem) to maintain interface consistency
- **Test-Driven Cache Fixes**: Cache bugs can be subtle - write comprehensive tests that verify different parameter combinations create separate cache entries before implementing the fix

### Error Diagnostics and User Experience

- **Detailed Error Reporting**: When implementing fallback strategies, collect and preserve errors from each attempt. Users need to know not just that something failed, but which specific strategies were tried and why each failed
- **Diagnostics Object Pattern**: Include a diagnostics object in error responses with: strategiesAttempted (array), strategyErrors (map), and timing (map). This provides actionable debugging information without cluttering the main error message
- **Test Coverage for Error Cases**: Error handling paths need explicit functional test coverage. Create dedicated test files for diagnostics features to ensure error messages remain helpful as code evolves
- **Environment Variable Consistency**: When renaming environment variables, search the entire codebase including tests, CI workflows, and documentation. Inconsistent naming leads to silent failures where health checks pass incorrectly
