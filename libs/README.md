# Libraries Directory

This directory contains standalone libraries that are part of the PulseMCP monorepo but are intended to eventually become independent packages.

## Current Libraries

### mcp-server-template

A template structure for creating new MCP servers. This template provides:

- Standard project structure with local/shared/remote architecture
- Pre-configured TypeScript setup
- Basic MCP server implementation with example resources and tools
- Testing setup with Vitest
- Development scripts and tooling

**Future Plans**: This template will eventually be published as a standalone npm package to help developers quickly bootstrap new MCP servers.

### test-mcp-client

A testing utility for MCP servers that provides:

- Programmatic client for testing MCP servers
- Integration test support via IPC transport
- Mock-friendly architecture for unit testing
- Utilities for verifying server responses

**Future Plans**: This will be published as a standalone npm package to provide a standardized testing solution for all MCP server developers.

## Usage

While these libraries are currently part of the monorepo, they are designed to be self-contained and can be referenced by other packages in the repository.

For example, MCP servers in this repository use test-mcp-client for their integration tests:

```typescript
import { TestMCPClient } from '../../../libs/test-mcp-client/build/index.js';
```

## Contributing

When making changes to these libraries, please ensure they remain generic and reusable, as they will eventually be extracted into standalone packages.
