# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Also review [CONTRIBUTING.md](./CONTRIBUTING.md) for context.

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

### IMPORTANT: Git Branch Management

**DO NOT** create new git branches or worktrees unless explicitly asked by the user. Always:

- Stay on the current branch you're working on
- Make all changes directly on the existing branch
- Only switch branches or create new ones when specifically instructed
- Avoid using `git checkout -b`, `git switch -c`, or `git worktree add` without explicit permission

### Linting and Pre-Commit Hooks

**CRITICAL: ALL linting must be run from the repository root.** This monorepo uses centralized linting configuration.

**Always run these commands from the repo root before pushing to avoid CI failures:**

```bash
npm run lint       # Check for linting issues
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format code with Prettier
```

**IMPORTANT: NEVER use `git commit --no-verify` to bypass pre-commit hooks.** If pre-commit hooks fail:

### Troubleshooting Pre-Commit Hook Failures

**🔨 Module/Dependency Issues** (Most common - "Cannot find module" errors):

```bash
# Always run from repo root
cd /path/to/repo/root
rm -rf node_modules package-lock.json
npm install
```

**📝 Linting Issues:**

```bash
npm run lint:fix    # From repo root only
```

**🎨 Formatting Issues:**

```bash
npm run format      # From repo root only
```

**📁 Committing from Subdirectories:**

```bash
# Instead of committing from experimental/twist/ or other subdirs:
cd /path/to/repo/root
git add .
git commit -m "Your message"
```

**Why These Issues Happen:**

- Monorepo complexity with nested workspaces
- Module resolution conflicts between subdirectories
- Stale or corrupted dependency trees

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
npm test           # Run tests (functional and/or integration)
npm run test:manual # Run manual tests (if available - hits real APIs)
```

### Linting Best Practices

**ALWAYS run linting from the repository root:**

```bash
# ✅ CORRECT - Run from repo root
npm run lint           # Lint entire repo
npm run lint:fix       # Fix linting issues
npm run format         # Format all code

# ✅ CORRECT - Individual server linting (delegated to root)
cd experimental/twist && npm run lint    # Calls root linting
cd experimental/appsignal && npm run lint # Calls root linting
```

**❌ NEVER run linting tools directly from subdirectories:**

```bash
# ❌ WRONG - Direct eslint/prettier calls from subdirs
cd experimental/twist && eslint . --fix
cd experimental/twist && prettier --write .
```

**Why:** Subdirectories delegate to the root linting configuration to avoid dependency duplication and ensure consistent tooling across the monorepo.

## Technical Stack

- **Language**: TypeScript (ES2022 target)
- **Module System**: ES modules (`"type": "module"`)
- **Core Dependencies**: `@modelcontextprotocol/sdk`, `zod`
- **Build Tool**: TypeScript compiler (tsc)
- **Dev Tool**: tsx for development mode
- **Testing**: Vitest for unit, integration, and manual tests

## Testing Strategy

MCP servers may include up to three types of tests:

1. **Functional Tests** - Unit tests with all dependencies mocked
2. **Integration Tests** - Tests using TestMCPClient with mocked external APIs
3. **Manual Tests** - Tests that hit real external APIs (not run in CI)

Manual tests are particularly important when:

- Modifying code that interacts with external APIs
- Debugging issues that only appear with real API responses
- Verifying that API integrations work correctly

To run manual tests (when available):

```bash
# Set required environment variables (check specific server docs for exact names)
export API_KEY="your-real-api-key"
# Additional env vars may be optional or required depending on the server

# Run manual tests
npm run test:manual
```

## Creating New Servers

1. Copy the `mcp-server-template/` directory
2. Rename it to your server name
3. Update package.json name and description
4. Replace "NAME" and "DESCRIPTION" placeholders
5. Implement your resources and tools in src/index.ts

## Workspace Dependencies and Import Paths

**CRITICAL: DO NOT modify workspace import paths without understanding the publish workflow.**

Some MCP servers (like `experimental/twist/` and `experimental/appsignal/`) use a specialized workspace setup with carefully designed import paths that support both development and publishing:

### Development vs. Publishing Setup

These servers have a `local/` and `shared/` structure where:

- **Development**: `local/setup-dev.js` creates symlinks for development (e.g., `local/shared` → `../shared/dist`)
- **Publishing**: `local/prepare-publish.js` copies built files for npm publishing
- **Imports**: Use relative paths like `'../shared/index.js'` that work in both scenarios

### Import Path Rules

**✅ CORRECT**:

```typescript
import { createMCPServer } from '../shared/index.js';
```

**❌ WRONG** - Breaks publish workflow:

```typescript
import { createMCPServer } from 'twist-mcp-server-shared'; // Package name
import { createMCPServer } from '../shared/dist/index.js'; // Direct dist path
```

### If You Encounter Import Errors

1. **First**, run the setup script: `node setup-dev.js` in the `local/` directory
2. **Then**, ensure the shared module is built: `npm run build` in the `shared/` directory
3. **Never** change import paths to use package names or direct dist paths

This setup was established in commits #89, #91, #92 to resolve TypeScript build and npm publish issues. Modifying these import paths will break the publishing workflow.

## Additional Documentation

Each server directory contains its own CLAUDE.md with specific implementation details.
