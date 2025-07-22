# CI Setup for New Server

This guide helps you integrate your new MCP server into the monorepo's existing CI pipeline. Once completed, delete this file.

## Steps to Add Your Server to CI

### 1. Update Root-Level CI Scripts

Add your server to the appropriate CI commands in the root `package.json`:

- [ ] Add to `lint:*` scripts if your server should be linted
- [ ] Add to any test aggregation scripts if applicable

### 2. Verify Your Server Works with CI

From the repository root, ensure these commands include your server:

```bash
# Linting should check your server
npm run lint

# If there are root-level test commands, ensure they run your tests
npm run test:all  # (if this exists)
```

### 3. Test Locally

Before pushing, verify everything works:

```bash
# From your server directory
npm run lint
npm run format:check
npm run test:all
```

### 4. Checklist

- [ ] Server builds successfully with `npm run build`
- [ ] All tests pass with `npm run test:all`
- [ ] Linting passes with `npm run lint`
- [ ] Formatting is correct with `npm run format:check`
- [ ] Server is included in root-level CI scripts (if applicable)

### 5. Clean Up

- [ ] Delete this `CI_SETUP.md` file once your server is integrated

## Notes

- The monorepo CI will automatically pick up new servers in most cases
- If CI fails, check that all your dependencies are properly installed
- Ensure your server follows the same patterns as other servers in the repo

## Required Files for NPM Publishing

When adding a new server that will be published to npm, ensure these files exist:

### 1. `local/prepare-publish.js`

This script prepares the package for npm publication by:

- Installing TypeScript for the build
- Building the shared directory
- Setting up symlinks for the build process
- Building the local package
- Copying shared files into the local package

### 2. `scripts/prepare-npm-readme.js`

This script prepares the README for npm by:

- Combining the main README with local configuration sections
- Adding a GitHub repository reference
- Ensuring published packages have comprehensive documentation

If these files are missing, the CI publish workflow will fail with errors like:

```
Error: Cannot find module '/path/to/local/prepare-publish.js'
```

You can copy these files from existing servers like `experimental/appsignal/` or `experimental/twist/` and update the server name references.
