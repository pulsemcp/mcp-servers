# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with experimental MCP servers.

## Overview

This directory contains experimental MCP servers that are in active development or testing. These servers may not be production-ready and their APIs may change.

## Creating New Experimental Servers

1. Copy the `libs/mcp-server-template/` from the root directory
2. Move it into this experimental directory with your server name
3. Follow the standard development process
4. Once stable, the server can be moved to the root directory

## Standards

Even experimental servers should follow the repository standards:

- TypeScript with ES2022 target
- ES modules
- Use `@modelcontextprotocol/sdk` and `zod`
- Include proper error handling
- Document resources and tools in README.md

## Testing

Experimental servers are good places to:

- Try new MCP features
- Test different architectural patterns
- Prototype integrations
- Validate ideas before full implementation
