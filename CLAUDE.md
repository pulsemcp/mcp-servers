# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Also review [CONTRIBUTING.md](./CONTRIBUTING.md) for context.

## Repository Overview

This is a monorepo containing Model Context Protocol (MCP) servers built by PulseMCP. Each subfolder represents a standalone MCP server with its own functionality.

## Repository Structure

- **`productionized/`**: Directory for production-ready MCP servers
- **`experimental/`**: Directory for experimental MCP servers in development
- **`libs/mcp-server-template/`**: Template structure for creating new MCP servers

## Git Workflow

- Repository: `https://github.com/pulsemcp/mcp-servers`
- Branch naming: `<github-username>/<feature-description>` (e.g., `tadasant/fix-bug`)
- Main branch has CI/CD
- Always include test coverage for changes
- PRs should have concise titles and detailed descriptions using this format:

### PR Description Format

**This overrides the default Claude Code PR template.** Do NOT use a `## Test plan` section with unchecked checkboxes. Instead, use this format:

```
## Summary
<what changed and why>

## Verification
- [x] <what you actually did to verify this works>
- [x] <proof: concrete evidence it works — not just an assertion>
```

The `## Verification` section documents how you closed the loop — what you _actually did_, not what _should be done_. Every checkbox must be checked before the PR is opened. If you can't verify something, explain why instead of leaving an unchecked box.

### Proof: Show, Don't Tell

Every verification item should include **proof** — concrete evidence that the change works. "Tested it and it works" is NOT proof. A screenshot, a test output, or a confirmation receipt IS proof.

**Proof types and when to use them:**

1. **E2E test report** — For backend/logic changes. Describe what you tested end-to-end and what happened. This is the most common type.
2. **Screenshot** — For UI changes. **UI changes MUST include screenshots. No exceptions.**
3. **External confirmation** — For tasks with external side effects (API calls, emails sent, deployments). Show the confirmation or response.

Good examples:

- `[x] E2E: created a session via the API, verified it appeared in the dashboard with correct metadata`
- `[x] Screenshot of updated settings page: ![settings](url)`
- `[x] Ran migration on staging, verified column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users';``
- `[x] Sent test email via new endpoint, confirmed delivery in Mailgun logs`
- `[x] CI green (lint + tests pass)`
- `[x] Self-reviewed PR diff — no unintended changes`

Bad examples (NEVER do this):

- `[ ] CI passes` — unchecked box, aspirational
- `[ ] Verify the server works end-to-end` — unchecked box, aspirational
- `[x] Tested it and it works` — this is an assertion, not proof. What did you test? What happened?
- `[x] Verified the feature works correctly` — says nothing. Show what you did and what you saw

Unchecked boxes in a PR description are useless — they describe aspirational work that nobody will do. Checked boxes without proof are almost as bad — they're assertions without evidence. Close the loop with concrete proof before handing the PR to a human.

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
cd ../../../libs/test-mcp-client && npm install @modelcontextprotocol/sdk@^1.13.2 --save
```

### Why This Structure?

- The root package.json manages workspaces and dev tools shared across the server
- The shared/local separation allows for clean publishing to npm
- Dependencies in the wrong place can cause build issues or incorrect npm packages

### Adding Dependencies to MCP Servers

When adding new dependencies:

1. **Add to the correct package.json**: Production dependencies go in `shared/package.json`, not the root
2. **Install the dependency**: Run `npm install <package> --save` from the `shared/` directory
3. **Build and test**: Run `npm run build` from the server root to verify everything works

Example:

```bash
cd productionized/pulse-fetch/shared
npm install @anthropic-ai/sdk --save  # Adds to package.json AND installs
cd ..
npm run build                         # Builds both shared and local
```

**Note**: CI automatically handles proper installation across all subdirectories using the `ci:install` script, so manual installation in multiple directories is not needed.

## Testing Strategy

**IMPORTANT: Run targeted tests locally, delegate full suite to CI.**

Running full test suites locally is prone to failure. Instead, run only targeted tests for the files you changed, then commit to a PR and let CI run the complete test suite.

MCP servers may include up to three types of tests:

1. **Functional Tests** - Unit tests with all dependencies mocked
2. **Integration Tests** - Tests using TestMCPClient with mocked external APIs
3. **Manual Tests** - Tests that hit real external APIs (not run in CI)

Manual tests are particularly important when:

- Modifying code that interacts with external APIs
- Debugging issues that only appear with real API responses
- Verifying that API integrations work correctly

To run targeted tests locally:

```bash
# Run tests for a specific MCP server you're working on
cd experimental/twist && npm test

# Run a specific test file
cd experimental/twist && npx vitest run tests/specific.test.ts

# Do NOT run tests for all servers locally - delegate to CI
# Instead, commit to a PR and let CI run the full test suite
```

To run manual tests (when available):

```bash
# IMPORTANT: Use .env files in the MCP server's source root for API keys
cd /to/mcp-server
less .env # Confirm it's there

# Run manual tests
npm run test:manual
```

**Note**: Always use `.env` files in the MCP server's source root to store API keys and credentials. Never commit these files to version control.

### CRITICAL: Manual Test Integrity Policy

**Manual tests MUST actually test real functionality against real APIs. No exceptions.**

- **NEVER** write manual tests that skip, bypass, or gracefully handle missing backend functionality
- **NEVER** use patterns like `if (response.includes('404')) { return; }` to silently pass when an endpoint doesn't exist
- **NEVER** implement client-side code for API endpoints that don't exist yet, then write "tests" that skip when the endpoint returns 404
- If a backend API endpoint doesn't exist, **DO NOT** write the client code until the backend is ready
- Manual tests exist to verify that real integrations work - a test that skips on failure defeats the entire purpose

**If you find yourself writing a manual test that needs to "gracefully handle" a missing endpoint:**

1. STOP - you are doing it wrong
2. The backend endpoint must exist and be functional BEFORE you write client code for it
3. Coordinate with the backend team first, get the endpoint deployed, THEN implement the client

**Why this matters:** A merged PR with "passing" manual tests that actually skip broken functionality gives false confidence. It results in shipped code that doesn't work, discovered only when users try to use it.

## PR Requirements: Version Bumps and Manual Testing

Every PR that changes an MCP server's code must include a version bump and manual test results. These are not optional or afterthoughts — do them proactively as part of the change.

### Version Bumping

Bump the version in the server's `local/package.json` as part of every PR:

- **Patch bump** (e.g., 1.2.3 → 1.2.4): Bug fixes, minor tweaks, small features, dependency updates
- **Minor bump** (e.g., 1.2.3 → 1.3.0): New tools, significant feature additions, breaking changes

Run from the server's `local/` directory:

```bash
cd <server-path>/local/
npm run stage-publish patch   # or "minor" for larger changes
```

This updates `local/package.json`, creates a git tag, and may modify the parent `package-lock.json`. Commit all modified files together. Also update the server's `CHANGELOG.md` — move items from `[Unreleased]` to a new version section with the version number and date.

Do not wait to be asked to bump the version. If you changed server code, bump the version.

### Manual Testing

Every PR must include running the server's manual test suite and recording the results:

1. Ensure `.env` exists in the server's root with the required API keys
2. Run manual tests: `npm run test:manual` from the server's root directory
3. Update the server's `MANUAL_TESTING.md` with results (commit hash, date, pass/fail summary)

If manual testing requires credentials or API keys that are not available, **ask the user for them** — do not skip manual testing. The CI `verify-publications` workflow will reject PRs with version bumps that lack updated manual test results.

See [PUBLISHING_SERVERS.md](./docs/PUBLISHING_SERVERS.md) for the full publication process.

## Creating New Servers

1. Copy the `libs/mcp-server-template/` directory
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
- When running `npm run stage-publish` from the local directory, it modifies both the local package-lock.json AND the parent package-lock.json - both must be committed together
- The version bump commit should include all modified files: local/package.json, local/package-lock.json, parent package-lock.json, CHANGELOG.md, and main README.md
- Your role is to **stage** the publication (version bump, tag, changelog) - NOT to publish to npm
- When simplifying tool parameters, consider the MCP best practices guide in libs/mcp-server-template/shared/src/tools/TOOL_DESCRIPTIONS_GUIDE.md for writing clear descriptions
- Breaking changes in tool parameters should be clearly marked in CHANGELOG.md with **BREAKING** prefix to alert users
- When using `set -e` in shell scripts with npm commands, be aware that `npm view` returns exit code 1 when a package doesn't exist yet - use `|| true` to prevent premature script termination during npm registry propagation checks
- **For `/publish_and_pr` command**: This means "stage for publishing and update PR" - it does NOT mean actually publish to npm. The workflow is: bump version → update changelog → commit → push → update PR. NPM publishing happens automatically via CI when PR is merged
- **Manual Testing Before Publishing**: Always run manual tests (with real API credentials) before staging a version bump to ensure the server works correctly with external APIs
- **Git Tag Format for Version Bumps**: When creating git tags for version bumps, use the format `package-name@version` (e.g., `appsignal-mcp-server@0.2.12`, `@pulsemcp/pulse-fetch@0.2.10`). The CI verify-publications workflow expects this exact format, not `server-name-vX.Y.Z`
- **Manual Testing and CI**: The verify-publications CI check requires that MANUAL_TESTING.md references a commit that's in the PR's history. If you make any commits after running manual tests (even just test fixes), the CI will fail. For test-only fixes, this is a known limitation that doesn't require re-running manual tests. When updating MANUAL_TESTING.md for packaging-only changes, ensure the commit hash matches a commit in the current PR branch
- **npm Package Files Field**: When specifying files to include in npm packages, use specific glob patterns (e.g., `"build/**/*.js"`) rather than entire directories (e.g., `"build/"`) to ensure proper file permissions and avoid including non-executable files. This prevents "Permission denied" errors when users run the package with npx

### Manual Testing Infrastructure

- All MCP servers should have a `MANUAL_TESTING.md` file to track manual test results
- Manual test files typically live in `tests/manual/` and use `.manual.test.ts` extension
- **First-time setup for new worktrees**: Always run `npm run test:manual:setup` before running manual tests in a fresh checkout or new worktree. This ensures all dependencies are installed, the project is built, and test-mcp-client is available
- **Always use `npm run test:manual` to run manual tests** - this script handles building, vitest configuration, and proper ESM support automatically. Don't try to run vitest directly or manually build the project first
- To run manual tests with proper ESM support, create a `scripts/run-vitest.js` wrapper that imports vitest's CLI directly
- The CI workflow `verify-mcp-server-publication.yml` checks for manual test results when version bumps occur - it verifies tests were run on a commit in the PR's history and checks for passing results
- When setting up manual tests for servers with workspace structures (local/shared), ensure dependencies are properly installed in all subdirectories before running tests
- Manual tests should run against built code (not source) - create a `run-manual-built.js` script that builds the project first, then runs tests against the compiled JavaScript
- CI should fail when MANUAL_TESTING.md isn't updated for the current PR, but NOT when tests fail (some failures might be expected due to API limitations)
- **Manual test setup checklist**: Verify .env exists with real API keys, run `ci:install` to install all workspace dependencies, run `build:test` to build everything including test-mcp-client
- **CRITICAL: Manual tests must actually pass against real APIs** - NEVER write tests that skip or gracefully handle missing backend endpoints. If an API endpoint doesn't exist, do not write client code for it. A "passing" test that silently skips on 404 is worse than no test at all because it provides false confidence

### Monorepo Dependency Management

- **Critical**: Never add production dependencies to root package.json files in workspace servers - these should only contain devDependencies
- **SDK Updates**: When updating @modelcontextprotocol/sdk, update it in both shared/package.json and local/package.json, never in the root
- **Common Mistake**: Running `npm install <package> --save` from the server root directory adds dependencies to the wrong package.json - always cd into shared/ or local/ first
- **CI Installation**: All MCP servers now have a `ci:install` script that ensures dependencies are installed in all subdirectories - this prevents `ERR_MODULE_NOT_FOUND` errors in published packages that occur when CI only runs `npm install` at the root level
- **Published Package Dependencies**: When adding new dependencies to shared/, they MUST also be added to local/package.json to ensure they're included in the published npm package - the prepare-publish.js script only copies built JS files, not node_modules

### Monorepo Reorganization

- **Directory Moves and ESLint Configs**: When moving directories deeper in the project structure (e.g., from root to a subdirectory), ESLint configs that extend parent configs need their relative paths updated. For example, moving from root to `libs/` requires changing `"extends": "../.eslintrc.json"` to `"extends": "../../.eslintrc.json"`
- **Comprehensive Reference Updates**: When reorganizing directories, search for references in all file types including .json, .md, .ts, .js, .yml files. Common places to check: import paths in test files, build scripts in package.json, CI workflow paths, documentation references, and tool guides
- **Pre-commit Hook Failures**: ESLint config path issues will cause pre-commit hooks to fail. Always test commits locally before pushing to catch these issues early

### Changelog management

Whenever you make any sort of code change to an MCP server, make sure to update the unreleased section of its corresponding `CHANGELOG.md`.

### Content-Type Based Architecture for MCP Servers

- **Binary Content Detection**: When implementing content parsing for MCP servers, always use `arrayBuffer()` for binary content types (PDFs, images, etc.) and `text()` for text-based content. Reading binary data as text results in massive Unicode replacement character corruption
- **Parser Factory Pattern**: Implement a factory pattern for content type routing (e.g., PDFParser, HTMLParser, PassthroughParser) to handle different content types appropriately. This makes the system extensible for future content types
- **Library Selection for Node.js**: When choosing PDF parsing libraries, prefer `pdf-parse` over `pdfjs-dist` for Node.js environments - pdfjs-dist has DOM dependencies that cause "DOMMatrix is not defined" errors in server environments
- **Content Type Integration**: Binary parsing (like PDFs) works seamlessly with existing HTML cleaning infrastructure - PDFs get parsed to text, then can be cleaned/processed by the same pipeline as HTML content

### Test Infrastructure Patterns

- **Memory Storage URI Collisions**: Memory storage implementations that generate URIs using timestamp-based schemes must account for rapid test execution. Using millisecond timestamps with stripped characters can cause collisions in fast CI environments - use 10ms+ delays between writes in tests
- **External Service Timeouts**: When manual tests encounter external service timeouts (like Firecrawl API), prioritize testing core functionality (native strategies, content parsing) over external service reliability. Network timeouts don't indicate code problems
- **Manual Test Result Documentation**: Always update MANUAL_TESTING.md with specific test results including: commit hash, test percentages, key functionality verified, and known external service issues. This provides CI verification and historical context

### Version Bump and Publication Workflow

- **File Staging for Version Bumps**: The `npm run stage-publish` command modifies multiple files that MUST be committed together: local/package.json, parent/package-lock.json, CHANGELOG.md, README.md, and MANUAL_TESTING.md. Never commit these files separately or CI will fail
- **Changelog Language Precision**: Avoid language like "restored" or "fixed" in changelogs when describing functionality that was developed within the same PR. Use accurate language like "added" or "implemented" to reflect what actually happened
- **Dependency Consistency in Monorepos**: When adding production dependencies, ensure they exist in both shared/package.json AND local/package.json for proper publishing. Dependencies only in the root package.json won't be available in published packages

### Build Script Robustness

- **TypeScript Build Error Propagation**: The traditional `cd shared && npm run build && cd ../local && npm run build` pattern fails silently because shell commands check only if `cd` succeeded, not if the build failed. This allowed TypeScript compilation errors to pass undetected in CI
- **Dynamic Import Compatibility**: Avoid using dynamic imports with JSON files in build scripts. The `import(file, { assert: { type: 'json' } })` syntax is not consistently supported across Node.js versions. Use `readFileSync` + `JSON.parse` for better compatibility
- **CI/CD TypeScript Dependency Checks**: Always ensure @types packages are included as devDependencies when using libraries that don't ship with their own types (like jsdom). The build may work locally with cached types but fail in CI/CD's clean environment

### Pre-commit Hook and Version Bump Workflow

- **Lint-staged Automatic Stash Behavior**: When pre-commit hooks fail, lint-staged automatically stashes your changes. These can be recovered using `git stash list` and looking for "lint-staged automatic backup" entries. Apply with `git stash apply stash@{n}`
- **Version Bump Recovery**: If `npm run stage-publish` fails or gets interrupted, changes may be partially applied. Check all expected files (local/package.json, CHANGELOG.md, MANUAL_TESTING.md, README.md) and re-run the version bump with `npm version patch --no-git-tag-version` if needed
