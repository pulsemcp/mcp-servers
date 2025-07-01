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
rm -rf node_modules
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

## Dependency Management

### Important: Monorepo Structure

This repository uses npm workspaces with a specific structure for MCP servers:

```
server-name/
├── package.json          # Root workspace file - NO production dependencies here!
├── shared/
│   └── package.json     # Has @modelcontextprotocol/sdk and other deps
└── local/
    └── package.json     # Has @modelcontextprotocol/sdk and other deps
```

### Rules for Adding/Updating Dependencies

1. **Root package.json** (e.g., `experimental/twist/package.json`):
   - Should ONLY contain `devDependencies` (like vitest, dotenv, @types/node)
   - Should NOT contain `@modelcontextprotocol/sdk` or other production dependencies
   - Used only for workspace management and development tools

2. **Shared and Local package.json files**:
   - These are where production dependencies like `@modelcontextprotocol/sdk` belong
   - Update these files directly when changing SDK or other runtime dependencies

### Updating Dependencies Across All Servers

When updating a dependency (like `@modelcontextprotocol/sdk`) across all servers:

```bash
# ❌ WRONG - Don't run npm install from root directories
cd experimental/twist && npm install @modelcontextprotocol/sdk@latest --save

# ✅ CORRECT - Update each package.json that needs it
cd experimental/twist/shared && npm install @modelcontextprotocol/sdk@^1.13.2 --save
cd experimental/twist/local && npm install @modelcontextprotocol/sdk@^1.13.2 --save
```

Example for updating SDK across all servers:

```bash
# Update twist
cd experimental/twist/shared && npm install @modelcontextprotocol/sdk@^1.13.2 --save
cd ../local && npm install @modelcontextprotocol/sdk@^1.13.2 --save

# Update appsignal
cd ../../appsignal/shared && npm install @modelcontextprotocol/sdk@^1.13.2 --save
cd ../local && npm install @modelcontextprotocol/sdk@^1.13.2 --save

# Update pulse-fetch
cd ../../../productionized/pulse-fetch/shared && npm install @modelcontextprotocol/sdk@^1.13.2 --save
cd ../local && npm install @modelcontextprotocol/sdk@^1.13.2 --save

# Don't forget test-mcp-client if needed
cd ../../../test-mcp-client && npm install @modelcontextprotocol/sdk@^1.13.2 --save
```

### Why This Structure?

- The root package.json manages workspaces and dev tools shared across the server
- The shared/local separation allows for clean publishing to npm
- Dependencies in the wrong place can cause build issues or incorrect npm packages

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

## Claude Learnings

Contexts and tips I've collected while working on this codebase.

**Adding New Learnings**: Only add learnings that meet ALL criteria:

1. **Non-obvious**: Would take significant time to rediscover OR could be easily missed despite being important
2. **Reusable**: Likely to be relevant in future work, not a one-off fix
3. **Not already documented**: Before adding, review existing documentation (README files, docs/, CONTRIBUTING.md, etc.) to ensure you're not duplicating guidance. If the information exists elsewhere, reference that documentation instead of restating it.

Don't add: basic TypeScript fixes, standard npm troubleshooting, obvious file operations, implementation details that are self-evident from reading code, or anything already covered in existing documentation.

### Interacting with human user

- Whenever you hand back control to the user after doing some work, always be clear about what the next step / ask of the human is
- For example, if it's to review a PR, include a link to the PR that needs reviewing

### Development Workflow

- Always run linting commands from the repository root, not from subdirectories, to ensure consistent tooling across the monorepo
- When pre-commit hooks fail with "Cannot find module" errors, the solution is typically to `rm -rf node_modules && npm install` from the repo root
- The specialized workspace setup in some servers (like `experimental/twist/` and `experimental/appsignal/`) uses relative import paths that work for both development and publishing - never change these to package names or direct dist paths
- When adding parameters that need to propagate through multiple layers (e.g., timeout), ensure they're passed at each level: tool → strategy → client implementation

### Testing Strategy

- Manual tests are critical when modifying code that interacts with external APIs, as they verify real API responses match our interfaces
- Integration tests with TestMCPClient are valuable for testing MCP server functionality without hitting real APIs
- Environment variable validation at startup prevents silent failures and provides immediate feedback to users
- When removing parameters from tool APIs, check for: duplicate interface definitions (e.g., in types.ts), test mock expectations, and all test files using those parameters
- TypeScript compilation errors in tests often reveal missed updates - the error messages point to exact locations needing fixes
- When changing output formats (e.g., markdown to HTML), update both the implementation AND test expectations to match

### Git and PR Workflow

- Branch naming follows `<github-username>/<feature-description>` pattern
- Always ensure CI passes before considering a PR complete
- Pre-commit hooks automatically run lint-staged, but manual linting should still be run before pushing to avoid CI failures

### Publishing Process

- See [PUBLISHING_SERVERS.md](./docs/PUBLISHING_SERVERS.md) for the complete publishing process
- **⚠️ CRITICAL: NEVER run `npm publish` locally! CI/CD handles all npm publishing automatically when PRs are merged to main**
- Key gotcha: Git tags may not be created automatically by npm version - always verify with `git tag | grep <server-name>` and create manually if needed
- When running `npm run stage-publish` from the local directory, it modifies both the local package-lock.json AND the parent package-lock.json - both must be committed together
- The version bump commit should include all modified files: local/package.json, local/package-lock.json, parent package-lock.json, CHANGELOG.md, and main README.md
- Your role is to **stage** the publication (version bump, tag, changelog) - NOT to publish to npm
- When simplifying tool parameters, consider the MCP best practices guide in mcp-server-template/shared/src/tools/TOOL_DESCRIPTIONS_GUIDE.md for writing clear descriptions
- Breaking changes in tool parameters should be clearly marked in CHANGELOG.md with **BREAKING** prefix to alert users
- When using `set -e` in shell scripts with npm commands, be aware that `npm view` returns exit code 1 when a package doesn't exist yet - use `|| true` to prevent premature script termination during npm registry propagation checks
- **For `/publish_and_pr` command**: This means "stage for publishing and update PR" - it does NOT mean actually publish to npm. The workflow is: bump version → update changelog → commit → push → update PR. NPM publishing happens automatically via CI when PR is merged

### Monorepo Dependency Management

- **Critical**: Never add production dependencies to root package.json files in workspace servers - these should only contain devDependencies
- **SDK Updates**: When updating @modelcontextprotocol/sdk, update it in both shared/package.json and local/package.json, never in the root
- **Common Mistake**: Running `npm install <package> --save` from the server root directory adds dependencies to the wrong package.json - always cd into shared/ or local/ first
