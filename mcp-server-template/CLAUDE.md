# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the MCP server template.

## Overview

This is a template directory for creating new MCP servers. It provides the minimal boilerplate needed to start building a new server with TypeScript.

## Using This Template

1. **Copy the entire directory** to your desired location (root or experimental/)
2. **Rename the directory** to your server name (e.g., `mcp-server-weather`)
3. **Update placeholders** throughout the files:
   - Replace `NAME` with your server name
   - Replace `DESCRIPTION` with your server description
   - Update the README.md with actual features

## Template Structure

```
mcp-server-template/
├── src/
│   └── index.ts      # Main server implementation
├── dist/             # Built JavaScript output (git-ignored)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── README.md         # User documentation template
└── .gitignore        # Standard git ignores
```

## Implementation Guide

The template provides:
- Basic MCP server setup with stdio transport
- Placeholder handlers for resources and tools
- Standard TypeScript configuration
- Common npm scripts (build, start, dev)

To implement your server:
1. Add your tools in the `ListToolsRequestSchema` handler
2. Implement tool execution in the `CallToolRequestSchema` handler
3. Add your resources in the `ListResourcesRequestSchema` handler
4. Implement resource reading in the `ReadResourceRequestSchema` handler

## Best Practices

- Keep all business logic well-organized
- Use zod for input validation
- Handle errors gracefully
- Document all resources and tools in README.md
- Follow the repository's TypeScript conventions