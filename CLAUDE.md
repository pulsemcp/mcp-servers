# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo containing Model Context Protocol (MCP) servers built by PulseMCP. Each subfolder represents a standalone MCP server with its own functionality.

## Repository Structure

- **`pulse-fetch/`**: MCP server for pulling internet resources into context
- **`experimental/`**: Directory for experimental MCP servers in development
- **`mcp-server-template/`**: Template structure for creating new MCP servers

## Git Workflow

- Repository: `https://github.com/pulsemcp/mcp-servers`
- Branch naming: `<github-username>/<feature-description>` (e.g., `tadasant/fix-bug`)
- Main branch has CI/CD
- Always include test coverage for changes
- PRs should have concise titles and detailed descriptions

### Post-Commit Linting

After making any commit, you'll see a reminder to run linting. **Always run these commands before pushing to avoid CI failures:**

```bash
npm run lint       # Check for linting issues
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format code with Prettier
```

The repository uses:

- **ESLint** for code quality and style enforcement
- **Prettier** for consistent code formatting
- **Husky** for git hooks (pre-commit runs lint-staged automatically)
- **lint-staged** for running linters on staged files

## Common Development Commands

Most MCP servers in this repo follow these conventions:

```bash
npm install        # Install dependencies
npm run build      # Build TypeScript to JavaScript
npm start          # Run the server
npm run dev        # Development mode with auto-reload
npm run lint       # Check for linting issues
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format code with Prettier
```

### Linting at Different Levels

You can run linting at different directory levels:

```bash
# Root level (entire repo)
npm run lint

# Specific servers
npm run lint:pulse-fetch    # Lint pulse-fetch server
npm run lint:appsignal      # Lint appsignal server
npm run lint:test-client    # Lint test-mcp-client

# Or navigate to specific directories
cd experimental/appsignal && npm run lint
cd productionized/pulse-fetch && npm run lint
```

## Technical Stack

- **Language**: TypeScript (ES2022 target)
- **Module System**: ES modules (`"type": "module"`)
- **Core Dependencies**: `@modelcontextprotocol/sdk`, `zod`
- **Build Tool**: TypeScript compiler (tsc)
- **Dev Tool**: tsx for development mode

## Creating New Servers

1. Copy the `mcp-server-template/` directory
2. Rename it to your server name
3. Update package.json name and description
4. Replace "NAME" and "DESCRIPTION" placeholders
5. Implement your resources and tools in src/index.ts

## Additional Documentation

Each server directory contains its own CLAUDE.md with specific implementation details.
