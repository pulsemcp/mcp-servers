# CLAUDE.md

This file provides guidance to Claude Code when working with the Playwright Stealth MCP Server.

## Overview

This is an MCP server that provides browser automation using Playwright with optional stealth mode. It follows a simplified design inspired by [playwriter](https://github.com/remorses/playwriter) - exposing a single `browser_execute` tool instead of many specialized tools.

## Key Design Decisions

1. **Single Execute Tool**: Instead of separate tools for navigation, clicking, etc., we expose one `browser_execute` tool that takes Playwright code. This reduces context usage and leverages existing Playwright knowledge.

2. **Stealth Mode Toggle**: The `STEALTH_MODE` environment variable switches between:
   - `false`: Standard Playwright (faster, simpler)
   - `true`: playwright-extra with puppeteer-extra-plugin-stealth (anti-bot bypass)

3. **Persistent Sessions**: The browser stays open across tool calls, enabling multi-step automation workflows.

## Directory Structure

```
playwright-stealth/
├── shared/              # Core logic (npm publishable)
│   └── src/
│       ├── server.ts    # PlaywrightClient and server factory
│       ├── tools.ts     # Tool definitions and handlers
│       ├── types.ts     # TypeScript interfaces
│       └── logging.ts   # Logging utilities
├── local/               # CLI entry point (npm publishable)
│   └── src/
│       ├── index.ts     # Main entry point
│       └── index.integration-with-mock.ts
├── tests/               # Test suite
│   ├── functional/      # Unit tests with mocks
│   ├── integration/     # MCP protocol tests
│   └── manual/          # Real browser tests
└── scripts/             # Build and test scripts
```

## Key Files

- `shared/src/server.ts` - The `PlaywrightClient` class handles browser lifecycle and code execution
- `shared/src/tools.ts` - Tool definitions using the factory pattern
- `local/src/index.ts` - Environment validation and server startup

## Testing

```bash
# Unit tests
npm test

# Integration tests (uses mock client)
npm run test:integration

# Manual tests (requires real browser)
npm run test:manual:setup
npm run test:manual
```

## Common Tasks

### Adding a New Tool

1. Add schema in `shared/src/tools.ts`
2. Add description and handler in the `tools` array
3. Add tests in `tests/functional/tools.test.ts`

### Modifying Stealth Behavior

The stealth configuration is in `PlaywrightClient.ensureBrowser()` in `shared/src/server.ts`.

### Debugging

Set `DEBUG=true` to see configuration details in stderr.
