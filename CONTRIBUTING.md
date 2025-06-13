# Contributing

## Project management

We are open to community contributions, but please open an Issue and confirm getting assigned to it before writing code.

## Development Setup

### Installing Dependencies

```bash
# Install root dependencies (includes linting tools)
npm install

# Install dependencies for specific servers
cd experimental/appsignal && npm run install-all
cd productionized/pulse-fetch && npm install
```

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
