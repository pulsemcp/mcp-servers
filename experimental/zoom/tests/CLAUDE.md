# Testing Philosophy

## Core Principle

**Only mock external services. Never mock internal code.**

This means:

- The Zoom API (HTTP calls to `api.zoom.us`) is the **only** thing we mock
- The `ZoomClient` class, tool handlers, Zod validation, output formatting, `createMCPServer`, `registerHandlers` — all run as real code
- No mocking model methods, service objects, utilities, or any class/method in our codebase

## Why?

Mocking internal code hides bugs. When implementations change, mock-heavy tests keep passing while real code breaks. By only mocking at the external boundary, our tests verify that the full internal stack actually works together.

## Test Layers

### Functional Tests (`tests/functional/`)

Tests that exercise internal code paths with mocked external boundaries.

**What to mock**: `global.fetch` — intercept HTTP calls to the Zoom API and return controlled responses.

**What runs as real code**: Everything else — `ZoomClient`, tool handlers, Zod schema validation, output formatting, error handling, `createMCPServer`, `registerHandlers`.

**When to write these**: For any scenario that depends on specific API responses or timing that can't be guaranteed in a live environment. Examples:

- Time-dependent behavior (e.g., "meetings from the past 7 days")
- Error responses (401, 404, 429 rate limiting)
- Edge cases in API response shapes (empty arrays, pagination tokens, large payloads)
- Verifying that query parameters are correctly constructed and sent to the API

### Integration Tests (`tests/integration/`)

Full MCP protocol tests via `TestMCPClient` that verify the server speaks MCP correctly. These pass mock data via the `ZOOM_MOCK_DATA` environment variable, which the integration entry point parses to construct a mock `IZoomClient`, avoiding real API calls.

### Manual Tests (`tests/manual/`)

Tests that hit the real Zoom API. Require `.env` with valid credentials. Used to verify real API compatibility before publishing.

### E2E / STATE.md (`tests/e2e/`)

Documents external state invariants required for manual/e2e testing (e.g., "at least 1 meeting with recordings exists in the Zoom account").

## The Mocking Boundary

```
┌─────────────────────────────────────────────────────┐
│                  Our Code (REAL)                     │
│                                                     │
│  Tool Handlers → ZoomClient → fetch() calls         │
│  Zod Validation   Output Formatting                 │
│  Server Factory   Tool Registration                 │
│                                                     │
└────────────────────────┬────────────────────────────┘
                         │
                    ── mock here ──
                         │
┌────────────────────────▼────────────────────────────┐
│              External Service (MOCKED)               │
│                                                     │
│  Zoom API (api.zoom.us/v2/*)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## How to Mock Fetch

Use `vi.spyOn(global, 'fetch')` to intercept HTTP calls. Match on URL patterns to return different responses for different endpoints:

```typescript
vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
  const urlStr = url.toString();
  if (urlStr.includes('/users/me/meetings')) {
    return new Response(JSON.stringify({ meetings: [...], total_records: 1 }));
  }
  // ...
});
```

Always restore the original fetch in `afterEach` via `vi.restoreAllMocks()`.

## What NOT to Do

- **Don't mock `ZoomClient` methods** — the client's HTTP logic, URL construction, and error handling are part of what we're testing
- **Don't mock tool handler functions** — the Zod validation and output formatting are part of what we're testing
- **Don't mock `createMCPServer` or `registerHandlers`** — the server wiring is part of what we're testing
- **Don't write tests that skip on API errors** — if something fails, the test should fail
