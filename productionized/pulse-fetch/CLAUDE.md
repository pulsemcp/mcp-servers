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
- **Vitest Configuration**: Always exclude manual test directories (`**/manual/**`) from Vitest configuration to prevent CI failures - manual tests use `node --import tsx` and don't contain Vitest test suites
- **CI Monitoring**: Use `gh run list --branch <branch-name>` to check workflow runs when `gh pr checks` doesn't show results - CI may complete successfully even if checks aren't visible in PR view
- **Manual Test Verification**: Always test manual test suites locally with both success and failure cases to ensure they correctly detect issues and avoid false positives
