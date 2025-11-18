# Pulse Fetch Integration Tests

This directory contains integration tests for the Pulse Fetch MCP server. The tests are designed to run in two modes to ensure that both the development version and the published package work correctly.

## Test Modes

### 1. Source Mode

Tests run against the built TypeScript source code. This is the traditional testing approach and is faster for development.

### 2. Built Mode

Tests run against the actual packaged output that would be published to npm. This ensures that the packaging process works correctly and catches issues that only appear in the published version.

## Running Tests

### Run both source and built tests (recommended):

```bash
npm run test:integration
```

### Run only source mode tests:

```bash
npm run test:integration:source
```

### Run only built mode tests:

```bash
npm run test:integration:built
```

### Watch mode:

```bash
npm run test:integration:watch
```

## Architecture

### Test Runner (`test-runner.ts`)

A shared test runner that accepts a configuration object specifying:

- `name`: The mode name (SOURCE or BUILT)
- `serverPath`: Path to the server executable
- `setup`: Optional async function to prepare the test environment

### Test Files

- `pulse-fetch.source.integration.test.ts`: Runs tests against the built TypeScript source
- `pulse-fetch.built.integration.test.ts`: Runs tests against the packaged npm output
- `pulse-fetch.integration.test.ts`: Main entry point that imports both source and built tests
- `test-runner.ts`: Shared test logic used by both test files

### Built Mode Process

The built mode testing simulates the exact CI/CD publish process:

1. Copies the local package to a test directory
2. Runs `ci:install` (or `npm install` if not available)
3. Executes `prepare-publish.js` directly (same as `prepublishOnly` hook)

This ensures our tests match exactly what happens during CI/CD publishing.

## How Built Mode Works

1. **Setup Phase**:
   - Creates a `.test-publish` directory (gitignored)
   - Copies the local package files (excluding node_modules and build output)
   - Runs the `package-for-publish.js` script to simulate the npm publish process

2. **Test Phase**:
   - Runs the same integration tests against the packaged output
   - Uses the `index.integration-with-mock.js` file with mocked dependencies

3. **Cleanup**:
   - The `.test-publish` directory persists between runs unless manually deleted
   - Automatically cleaned and rebuilt on each test run

## Benefits

1. **Early Detection**: Catches packaging issues before they reach npm
2. **Confidence**: Ensures the published package works exactly as tested
3. **Consistency**: Uses the same packaging process as CI/CD
4. **Development Speed**: Source mode tests remain fast for iterative development

## Common Issues

### Missing Dependencies

If you see "Cannot find module" errors in built mode, it likely means a dependency is missing from the published package. Check:

- Dependencies are in the correct package.json (local vs shared)
- The `files` field in package.json includes all necessary files
- Build output is being generated correctly

### Build Failures

If the built mode setup fails:

1. Check that all source files compile without errors
2. Ensure the shared directory builds successfully
3. Verify that setup-dev.js and prepare-publish.js are working correctly

### Test Timeouts

Built mode tests take longer due to the packaging process. The timeout is set to 60 seconds, but can be increased in `vitest.config.integration.ts` if needed.
