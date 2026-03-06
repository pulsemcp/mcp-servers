# SVG Tracer MCP Server - Development Guide

## Architecture

This server follows the standard MCP server template pattern:

- `shared/` - Core business logic (tracer engine, tool definitions)
- `local/` - Stdio transport entry point
- `tests/` - Functional, integration, and manual tests

## Key Implementation Details

### Tracer Engine (`shared/src/tracer/index.ts`)

The tracer engine handles three stages:

1. **Preprocessing** - Uses sharp to handle alpha channels. Transparent PNGs are converted to grayscale where opaque pixels become black and transparent pixels become white (ITU-R BT.601 luminance weighting).

2. **Tracing** - Uses the potrace npm package (CommonJS module imported via `createRequire`) to convert the preprocessed bitmap to SVG vector paths.

3. **Scaling** - Optionally wraps SVG paths in a `<g transform="...">` element to fit target dimensions while preserving aspect ratio.

### No External API Dependencies

This server operates entirely on the local filesystem. No API keys or external services are required.

### potrace Import Pattern

The `potrace` npm package is a CommonJS module without TypeScript types. It's imported using `createRequire(import.meta.url)` with an inline type cast in `tracer/index.ts`.

## Testing

```bash
npm run test:run           # Functional tests (32 tests)
npm run test:integration   # Integration tests via TestMCPClient (6 tests)
npm run test:all           # Both functional + integration
```

Test fixtures are generated programmatically via `tests/fixtures/generate-test-images.ts`.

## Dependencies

- **sharp** - Image I/O and preprocessing (handles all input formats, alpha channel extraction)
- **potrace** - Bitmap-to-SVG tracing (JavaScript port of the Potrace algorithm)
- **zod** - Input validation
- **@modelcontextprotocol/sdk** - MCP protocol implementation
