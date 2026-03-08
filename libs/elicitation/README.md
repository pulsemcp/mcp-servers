# @pulsemcp/mcp-elicitation

Reusable elicitation library for PulseMCP MCP servers. Provides user confirmation flows with automatic fallback from native MCP elicitation to HTTP-based approval, designed for easy adoption across the monorepo.

**Status:** Internal workspace dependency (not published to npm). Referenced via `"file:../../../libs/elicitation"` in consumer `package.json` files. The Gmail MCP server bundles it into its npm package via `bundledDependencies`.

## Decision Tree

When `requestConfirmation()` is called, it walks through four tiers:

```
Tier 1: ELICITATION_ENABLED=false?
  └─ YES → return { action: 'accept' } (skip confirmation entirely)
  └─ NO  ↓

Tier 2: Client supports native elicitation?
  └─ YES → server.elicitInput() (MCP protocol, zero HTTP)
  └─ NO  ↓

Tier 3: ELICITATION_REQUEST_URL + ELICITATION_POLL_URL configured?
  └─ YES → POST request → poll for response (HTTP fallback)
  └─ NO  ↓

Tier 4: throw Error('no mechanism available')
```

**Tier 1** is the escape hatch: set `ELICITATION_ENABLED=false` to disable all confirmation prompts. This is useful for testing, CI, or deployments where confirmation is handled externally.

**Tier 2** uses the MCP protocol's native `elicitInput()` method. The library checks `server.getClientCapabilities()` for `{ elicitation: ... }` — if present, the client supports form-based elicitation natively (e.g., Claude Desktop, Cursor, etc.).

**Tier 3** is the HTTP fallback for clients that don't support native elicitation. The library POSTs an approval request to an external endpoint, then polls a status URL until the user responds or the TTL expires. This enables web-based approval UIs.

**Tier 4** throws if elicitation is enabled but no mechanism is available. This ensures the server doesn't silently skip confirmation for destructive actions.

## Quick Start

### 1. Add the dependency

In your MCP server's `shared/package.json`:

```json
{
  "dependencies": {
    "@pulsemcp/mcp-elicitation": "file:../../../libs/elicitation"
  }
}
```

### 2. Use in a tool handler

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  requestConfirmation,
  createConfirmationSchema,
  readElicitationConfig,
} from '@pulsemcp/mcp-elicitation';

function myDangerousTool(server: Server) {
  return {
    name: 'delete_everything',
    handler: async (args: unknown) => {
      // Read config from env vars
      const config = readElicitationConfig();

      if (config.enabled) {
        const result = await requestConfirmation(
          {
            server,
            message: 'Are you sure you want to delete everything?',
            requestedSchema: createConfirmationSchema(
              'Delete everything?',
              'This action cannot be undone.'
            ),
            meta: {
              'com.pulsemcp/tool-name': 'delete_everything',
            },
          },
          config
        );

        if (result.action === 'decline' || result.action === 'cancel') {
          return { content: [{ type: 'text', text: 'Cancelled.' }] };
        }

        if (result.action === 'expired') {
          return { content: [{ type: 'text', text: 'Confirmation expired.' }], isError: true };
        }

        // Check the confirm field for explicit rejection
        if (result.content?.confirm === false) {
          return { content: [{ type: 'text', text: 'Not confirmed.' }] };
        }
      }

      // Proceed with the action...
    },
  };
}
```

## API Reference

### `requestConfirmation(options, config?)`

Main entry point. Walks the decision tree and returns the user's response.

```typescript
function requestConfirmation(
  options: RequestConfirmationOptions,
  config?: ElicitationConfig
): Promise<ElicitationResult>;
```

**Parameters:**

| Name                      | Type                           | Description                                                                  |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `options.server`          | `MCPServerLike`                | The MCP server instance (the SDK's `Server` object satisfies this interface) |
| `options.message`         | `string`                       | Human-readable message shown to the user                                     |
| `options.requestedSchema` | `ElicitationRequestedSchema`   | JSON Schema-like object defining the form fields                             |
| `options.meta`            | `ElicitationMeta` (optional)   | Vendor metadata (e.g., tool name, context)                                   |
| `config`                  | `ElicitationConfig` (optional) | Override config; defaults to `readElicitationConfig()`                       |

**Returns:** `Promise<ElicitationResult>`

| `result.action` | Meaning                                                 |
| --------------- | ------------------------------------------------------- |
| `'accept'`      | User accepted. Check `result.content` for field values. |
| `'decline'`     | User explicitly declined.                               |
| `'cancel'`      | User cancelled the dialog.                              |
| `'expired'`     | HTTP fallback TTL expired without a response.           |

**Throws:** If elicitation is enabled but no mechanism is available (Tier 4).

### `createConfirmationSchema(title?, description?)`

Helper that builds a simple boolean confirmation schema. Produces a form with a single `confirm: boolean` field.

```typescript
function createConfirmationSchema(
  title?: string, // default: 'Confirm'
  description?: string
): ElicitationRequestedSchema;
```

**Example output:**

```json
{
  "type": "object",
  "properties": {
    "confirm": {
      "type": "boolean",
      "title": "Send this email?",
      "description": "Confirm that you want to send this email immediately."
    }
  },
  "required": ["confirm"]
}
```

### `readElicitationConfig(env?)`

Reads configuration from environment variables (or a custom env object for testing).

```typescript
function readElicitationConfig(
  env?: Record<string, string | undefined> // default: process.env
): ElicitationConfig;
```

**Returns:**

```typescript
interface ElicitationConfig {
  enabled: boolean; // from ELICITATION_ENABLED (default: true)
  requestUrl?: string; // from ELICITATION_REQUEST_URL
  pollUrl?: string; // from ELICITATION_POLL_URL
  ttlMs: number; // from ELICITATION_TTL_MS (default: 300000 = 5 min)
  pollIntervalMs: number; // from ELICITATION_POLL_INTERVAL_MS (default: 5000, min: 1000)
}
```

Invalid numeric values (NaN, negative) fall back to defaults silently. Poll interval is clamped to a minimum of 1 second to prevent tight loops.

## Environment Variables

| Variable                       | Default  | Description                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `ELICITATION_ENABLED`          | `true`   | Set to `"false"` to disable all elicitation (Tier 1 bypass)        |
| `ELICITATION_REQUEST_URL`      | (none)   | POST endpoint for HTTP fallback approval requests                  |
| `ELICITATION_POLL_URL`         | (none)   | GET base URL for polling approval status (`{pollUrl}/{requestId}`) |
| `ELICITATION_TTL_MS`           | `300000` | TTL for HTTP fallback requests in milliseconds (5 minutes)         |
| `ELICITATION_POLL_INTERVAL_MS` | `5000`   | Poll interval in milliseconds (minimum: 1000)                      |

## HTTP Fallback Protocol

When the HTTP fallback is used (Tier 3), the library:

### 1. POST to `ELICITATION_REQUEST_URL`

```json
{
  "mode": "form",
  "message": "About to send an email:\n  To: user@example.com\n  Subject: Hello",
  "requestedSchema": { "type": "object", "properties": { "confirm": { "type": "boolean" } } },
  "_meta": {
    "com.pulsemcp/request-id": "uuid-v4",
    "com.pulsemcp/expires-at": "2026-03-08T12:05:00.000Z",
    "com.pulsemcp/tool-name": "send_email"
  }
}
```

**Expected response:** `200 OK` with `{ "requestId": "..." }`

### 2. GET `ELICITATION_POLL_URL/{requestId}`

Polled every `ELICITATION_POLL_INTERVAL_MS` until resolved or TTL expires.

**Expected responses:**

```json
// Pending (keep polling)
{ "action": "pending" }

// Accepted
{ "action": "accept", "content": { "confirm": true } }

// Declined
{ "action": "decline" }
```

Valid `action` values: `"pending"`, `"accept"`, `"decline"`, `"cancel"`, `"expired"`.

## Types

### `MCPServerLike`

Minimal interface the library requires from the MCP server. The SDK's `Server` class satisfies this interface structurally — no casting needed.

```typescript
interface MCPServerLike {
  getClientCapabilities(): { elicitation?: unknown } | undefined;
  elicitInput(params: unknown): Promise<{
    action: 'accept' | 'decline' | 'cancel';
    content?: Record<string, string | number | boolean | string[]>;
  }>;
}
```

**Why not import `Server` directly?** In monorepo setups, the `@modelcontextprotocol/sdk` package can end up installed in multiple `node_modules` directories. TypeScript treats `Server` from two different installations as incompatible types (private property declarations differ). `MCPServerLike` avoids this by defining only the public methods the library needs.

### `ElicitationMeta`

Vendor metadata using reverse-DNS prefix `com.pulsemcp/` per MCP spec conventions:

```typescript
interface ElicitationMeta {
  'com.pulsemcp/request-id'?: string;
  'com.pulsemcp/tool-name'?: string;
  'com.pulsemcp/context'?: string;
  'com.pulsemcp/session-id'?: string;
  'com.pulsemcp/expires-at'?: string;
}
```

### `ElicitationFieldSchema`

Schema for a single form field, mapping to the MCP spec's `PrimitiveSchemaDefinition`:

```typescript
interface ElicitationFieldSchema {
  type: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  default?: string | number | boolean;
  // String-specific
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'uri' | 'date' | 'date-time';
  enum?: string[];
  // Number-specific
  minimum?: number;
  maximum?: number;
}
```

### Custom Schemas

For forms beyond simple boolean confirmation, build your own schema:

```typescript
const schema: ElicitationRequestedSchema = {
  type: 'object',
  properties: {
    confirm: {
      type: 'boolean',
      title: 'Approve transfer?',
    },
    reason: {
      type: 'string',
      title: 'Reason',
      description: 'Optional justification for the transfer',
    },
    amount: {
      type: 'number',
      title: 'Amount',
      minimum: 0,
      maximum: 10000,
    },
  },
  required: ['confirm'],
};
```

## Testing

### In integration tests

Use `TestMCPClient` with an `elicitationHandler` to test native elicitation:

```typescript
import { TestMCPClient, ElicitationHandler } from 'test-mcp-client';

// Auto-accept
const handler: ElicitationHandler = async ({ message, requestedSchema }) => {
  return { action: 'accept', content: { confirm: true } };
};

const client = new TestMCPClient({
  serverPath: 'path/to/server.js',
  env: { ELICITATION_ENABLED: 'true' },
  elicitationHandler: handler,
});
```

### Disable for non-elicitation tests

Set `ELICITATION_ENABLED=false` in your test environment to prevent elicitation from interfering:

```typescript
const client = new TestMCPClient({
  serverPath: 'path/to/server.js',
  env: { ELICITATION_ENABLED: 'false' },
});
```

### Test the HTTP fallback

Spin up a local HTTP server and omit the `elicitationHandler` so native elicitation is unavailable:

```typescript
import http from 'node:http';

const mockServer = http.createServer((req, res) => {
  if (req.method === 'POST') {
    // Parse request, return { requestId }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ requestId: 'test-id' }));
  } else if (req.method === 'GET') {
    // Return approval decision
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ action: 'accept', content: { confirm: true } }));
  }
});

mockServer.listen(0, '127.0.0.1', () => {
  const port = (mockServer.address() as { port: number }).port;
  const client = new TestMCPClient({
    serverPath: 'path/to/server.js',
    env: {
      ELICITATION_ENABLED: 'true',
      ELICITATION_REQUEST_URL: `http://127.0.0.1:${port}/`,
      ELICITATION_POLL_URL: `http://127.0.0.1:${port}/`,
    },
    // NO elicitationHandler — forces HTTP fallback
  });
});
```

## Publishing with MCP Servers

Since this library isn't published to npm, MCP servers that use it must bundle it. The pattern:

1. Add `"@pulsemcp/mcp-elicitation": "file:../../../libs/elicitation"` to both `shared/package.json` and `local/package.json`
2. Add `"bundledDependencies": ["@pulsemcp/mcp-elicitation"]` to `local/package.json`
3. Add `"node_modules/@pulsemcp/mcp-elicitation/**/*.js"` and `"node_modules/@pulsemcp/mcp-elicitation/package.json"` to the `files` array
4. Update `prepare-publish.js` to build and copy the elicitation library into `local/node_modules/@pulsemcp/mcp-elicitation/`

See `experimental/gmail/local/` for a working example.
