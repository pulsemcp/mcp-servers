# Contributing

## Project management

We are open to community contributions, but please open an Issue and confirm getting assigned to it before writing code.

## Development Setup

### Prerequisites

This project requires Node.js v24.2.0. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions:

```bash
# Install the correct Node version
nvm install

# Use the correct Node version
nvm use
```

### Installing Dependencies

**Important**: Always install root dependencies first to set up git hooks and linting tools:

```bash
# Step 1: Install root dependencies (REQUIRED - includes linting tools and git hooks)
npm install

# Step 2: Install dependencies for specific servers
cd experimental/appsignal && npm run install-all
cd productionized/pulse-fetch && npm install
```

**Note**: If you see errors like `.husky/_/husky.sh: No such file or directory` when committing, it means you haven't run `npm install` in the root directory. This step is essential for setting up git hooks.

### Code Quality

This repository uses ESLint and Prettier to maintain code quality and consistency.

#### Running Linting

```bash
# Check entire repository
npm run lint
npm run format:check

# Auto-fix issues
npm run lint:fix
npm run format

# Lint specific servers
npm run lint:pulse-fetch
npm run lint:appsignal
npm run lint:test-client
```

#### Git Hooks

The repository uses Husky for git hooks:

- **Pre-commit**: Automatically runs lint-staged on changed files
- **Post-commit**: Reminds you to run linting before pushing

#### CI/CD

All pull requests and pushes to main will run:

- ESLint checks
- Prettier formatting checks
- TypeScript type checking
- Unit and integration tests

**Important**: Always run `npm run lint` and `npm run format` before pushing to avoid CI failures.

## Debugging tools

### Running Inspector

```
npx @modelcontextprotocol/inspector node path/to/mcp-servers/pulse-fetch/local/dist/index.js
```
