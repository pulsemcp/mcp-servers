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

## Planned Features

According to the README, future implementations will include:
- Basic scraping tools
- Web unblocker tools for accessing protected content