# Build Scripts for MCP Servers

This directory contains scripts to improve the build process for MCP servers in this monorepo.

## Problem

The current build pattern used in MCP server package.json files has a critical flaw:

```json
{
  "scripts": {
    "build": "cd shared && npm run build && cd ../local && npm run build"
  }
}
```

This pattern doesn't properly propagate TypeScript compilation errors. If the build fails in `shared/`, the script continues to build `local/`, resulting in silent failures where TypeScript errors are ignored.

## Solution

We've created a robust build script that properly handles errors and provides better feedback.

## Scripts

### `build-mcp-server.js`

A robust build script that:

- Properly propagates TypeScript compilation errors
- Provides clear, colored output showing build progress
- Exits with proper error codes on failure
- Shows helpful error messages for common issues

**Usage:**

From an MCP server directory:

```bash
node ../../scripts/build-mcp-server.js
```

From the monorepo root:

```bash
node scripts/build-mcp-server.js productionized/pulse-fetch
```

### `update-build-scripts.js`

A utility script to update all MCP servers to use the new build script.

**Usage:**

Dry run (see what would change):

```bash
node scripts/update-build-scripts.js --dry-run
```

Actually update the files:

```bash
node scripts/update-build-scripts.js
```

## Example

Here's how the build script improves error handling:

**Before (silent failure):**

```bash
$ npm run build
> cd shared && npm run build && cd ../local && npm run build
src/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
# Build continues despite error, exits with code 0
```

**After (proper failure):**

```bash
$ npm run build
> node ../../scripts/build-mcp-server.js

🔨 Building shared in shared
src/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
❌ Building shared failed with exit code 1

❌ Build failed: Building shared failed with exit code 1
ℹ️  TypeScript compilation errors detected - please fix them and try again
# Exits with code 1
```

## Benefits

1. **Proper Error Propagation**: Build failures are immediately caught and reported
2. **Better Developer Experience**: Clear, colored output shows exactly what's happening
3. **Helpful Error Messages**: Common issues include tips for resolution
4. **Consistent Exit Codes**: CI/CD systems can properly detect build failures
5. **Future Extensibility**: Easy to add pre/post build steps, parallel builds, etc.

## Integration with CI/CD

The new build script ensures that CI/CD pipelines will properly fail when TypeScript compilation errors occur, preventing broken code from being merged or published.
