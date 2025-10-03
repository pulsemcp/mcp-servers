# claude-code-agent MCP Server - Shared Module

This module contains the core business logic for the claude-code-agent MCP server.

## Overview

All resources and tools are implemented here and exported for use by local and remote implementations.

## Structure

```
shared/
├── src/
│   ├── index.ts      # Main exports
│   ├── resources.ts  # Resource implementations
│   ├── tools.ts      # Tool implementations
│   └── types.ts      # Shared types
└── dist/             # Built output
```

## Building

```bash
npm install
npm run build
```

## Usage

This module exports:

- `registerResources(server)` - Registers all resources
- `registerTools(server)` - Registers all tools

Both local and remote implementations import and use these functions.
