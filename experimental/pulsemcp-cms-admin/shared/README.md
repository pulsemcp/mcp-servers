# PulseMCP CMS Admin MCP Server - Shared Module

This module contains the core business logic for the PulseMCP CMS Admin MCP server.

## Overview

All tools are implemented here and exported for use by local and remote implementations.

## Structure

```
shared/
├── src/
│   ├── index.ts      # Main exports
│   ├── server.ts     # Server factory with dependency injection
│   ├── tools.ts      # Tool registration
│   ├── tools/        # Individual tool implementations
│   ├── types.ts      # Shared types
│   └── pulsemcp-admin-client/  # API client implementation
└── dist/             # Built output
```

## Building

```bash
npm install
npm run build
```

## Usage

This module exports:

- `createServer(clientFactory)` - Creates an MCP server with dependency injection
- `registerTools(server, clientFactory)` - Registers all tools

Both local and remote implementations import and use these functions.
