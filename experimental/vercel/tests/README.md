# Tests

## Test Types

### Functional Tests (`tests/functional/`)

Unit tests with all external dependencies mocked using vitest `vi.fn()`.

```bash
npm test
```

### Integration Tests (`tests/integration/`)

Full MCP protocol tests using `TestMCPClient` with mocked Vercel API.

```bash
npm run test:integration
```

### Manual Tests (`tests/manual/`)

Tests that hit the real Vercel API. Requires `VERCEL_TOKEN` in `.env`.

```bash
npm run test:manual:setup  # First time only
npm run test:manual
```

## Mock Organization

- `tests/mocks/vercel-client.functional-mock.ts` - vitest mocks for functional tests
- `shared/src/vercel-client/vercel-client.integration-mock.ts` - Plain TypeScript mocks for integration tests
